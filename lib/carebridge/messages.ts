import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/auth/roles";
import { createNotification } from "@/lib/carebridge/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

type ConversationRow = {
  id: string;
  patient_user_id: string;
  provider_user_id: string;
  appointment_id: string | null;
  subject: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type ConversationListItem = {
  id: string;
  subject: string;
  preview: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  appointmentId: string | null;
  appointmentLabel: string | null;
  counterpartName: string;
  counterpartMeta: string | null;
};

export type ConversationDetail = {
  conversation: ConversationRow;
  subject: string;
  appointmentLabel: string | null;
  counterpartName: string;
  counterpartMeta: string | null;
  messages: MessageRow[];
};

function formatAppointmentLabel(value: { start_time: string; timezone: string; appointment_type: string } | null) {
  if (!value) return null;
  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: value.timezone,
  }).format(new Date(value.start_time));

  return `${value.appointment_type.replace(/_/g, " ")} on ${formatted}`;
}

function defaultSubject(appointmentLabel: string | null) {
  return appointmentLabel ? `Appointment: ${appointmentLabel}` : "Secure message";
}

export async function listConversationsForUser(
  supabase: SupabaseClient,
  userId: string,
  role: Role | null | undefined
) {
  const { data: conversations, error } = await supabase
    .from("message_conversations")
    .select("id,patient_user_id,provider_user_id,appointment_id,subject,created_at,updated_at,last_message_at")
    .or(`patient_user_id.eq.${userId},provider_user_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (conversations ?? []) as ConversationRow[];
  if (rows.length === 0) return [] as ConversationListItem[];

  const conversationIds = rows.map((row) => row.id);
  const appointmentIds = rows.map((row) => row.appointment_id).filter((value): value is string => Boolean(value));
  const patientUserIds = Array.from(new Set(rows.map((row) => row.patient_user_id)));
  const providerUserIds = Array.from(new Set(rows.map((row) => row.provider_user_id)));

  const [{ data: messages }, { data: patients }, { data: providers }, { data: appointments }] = await Promise.all([
    supabase
      .from("messages")
      .select("id,conversation_id,sender_user_id,recipient_user_id,body,read_at,created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
    supabase.from("patients").select("user_id,legal_name,email").in("user_id", patientUserIds),
    supabase.from("providers").select("user_id,display_name,credentials,specialty").in("user_id", providerUserIds),
    appointmentIds.length
      ? supabase.from("appointments").select("id,start_time,timezone,appointment_type").in("id", appointmentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; start_time: string; timezone: string; appointment_type: string }> }),
  ]);

  const latestMessageByConversation = new Map<string, MessageRow>();
  const unreadCountByConversation = new Map<string, number>();

  for (const message of (messages ?? []) as MessageRow[]) {
    if (!latestMessageByConversation.has(message.conversation_id)) {
      latestMessageByConversation.set(message.conversation_id, message);
    }
    if (message.recipient_user_id === userId && !message.read_at) {
      unreadCountByConversation.set(message.conversation_id, (unreadCountByConversation.get(message.conversation_id) ?? 0) + 1);
    }
  }

  const patientMap = new Map(
    ((patients ?? []) as Array<{ user_id: string; legal_name: string | null; email: string | null }>).map((row) => [
      row.user_id,
      row,
    ])
  );
  const providerMap = new Map(
    ((providers ?? []) as Array<{ user_id: string; display_name: string | null; credentials: string | null; specialty: string | null }>).map((row) => [
      row.user_id,
      row,
    ])
  );
  const appointmentMap = new Map(
    ((appointments ?? []) as Array<{ id: string; start_time: string; timezone: string; appointment_type: string }>).map((row) => [
      row.id,
      row,
    ])
  );

  return rows.map((conversation) => {
    const latest = latestMessageByConversation.get(conversation.id) ?? null;
    const appointmentLabel = formatAppointmentLabel(
      conversation.appointment_id ? appointmentMap.get(conversation.appointment_id) ?? null : null
    );
    const counterpartUserId =
      role === "provider" || providerMap.has(userId) ? conversation.patient_user_id : conversation.provider_user_id;
    const provider = providerMap.get(conversation.provider_user_id);
    const patient = patientMap.get(conversation.patient_user_id);

    const counterpartName =
      counterpartUserId === conversation.provider_user_id
        ? provider?.display_name || "Provider"
        : patient?.legal_name || patient?.email || "Patient";
    const counterpartMeta =
      counterpartUserId === conversation.provider_user_id
        ? [provider?.credentials, provider?.specialty].filter(Boolean).join(" | ") || null
        : patient?.email || null;

    return {
      id: conversation.id,
      subject: conversation.subject || defaultSubject(appointmentLabel),
      preview: latest?.body ?? null,
      unreadCount: unreadCountByConversation.get(conversation.id) ?? 0,
      lastMessageAt: latest?.created_at ?? conversation.last_message_at,
      appointmentId: conversation.appointment_id,
      appointmentLabel,
      counterpartName,
      counterpartMeta,
    };
  });
}

export async function getConversationForUser(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  role: Role | null | undefined
) {
  const { data: conversation, error } = await supabase
    .from("message_conversations")
    .select("id,patient_user_id,provider_user_id,appointment_id,subject,created_at,updated_at,last_message_at")
    .eq("id", conversationId)
    .or(`patient_user_id.eq.${userId},provider_user_id.eq.${userId}`)
    .maybeSingle();

  if (error) throw error;
  if (!conversation) return null;

  const row = conversation as ConversationRow;
  const [{ data: messages }, { data: patient }, { data: provider }, { data: appointment }] = await Promise.all([
    supabase
      .from("messages")
      .select("id,conversation_id,sender_user_id,recipient_user_id,body,read_at,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    supabase.from("patients").select("user_id,legal_name,email").eq("user_id", row.patient_user_id).maybeSingle(),
    supabase.from("providers").select("user_id,display_name,credentials,specialty").eq("user_id", row.provider_user_id).maybeSingle(),
    row.appointment_id
      ? supabase
          .from("appointments")
          .select("id,start_time,timezone,appointment_type")
          .eq("id", row.appointment_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: string; start_time: string; timezone: string; appointment_type: string } | null }),
  ]);

  const counterpartName =
    role === "provider" || row.provider_user_id === userId
      ? patient?.legal_name || patient?.email || "Patient"
      : provider?.display_name || "Provider";
  const counterpartMeta =
    role === "provider" || row.provider_user_id === userId
      ? patient?.email || null
      : [provider?.credentials, provider?.specialty].filter(Boolean).join(" | ") || null;
  const appointmentLabel = formatAppointmentLabel(appointment ?? null);

  return {
    conversation: row,
    subject: row.subject || defaultSubject(appointmentLabel),
    appointmentLabel,
    counterpartName,
    counterpartMeta,
    messages: (messages ?? []) as MessageRow[],
  } satisfies ConversationDetail;
}

export async function getConversationIdForAppointment(
  supabase: SupabaseClient,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("message_conversations")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data?.id ?? null;
}

export async function ensureAppointmentConversation(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string
) {
  const existingId = await getConversationIdForAppointment(supabase, appointmentId);
  if (existingId) return { conversationId: existingId, created: false };

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id,start_time,timezone,appointment_type,patients(user_id),providers(user_id)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) throw error;
  if (!appointment) throw new Error("Appointment not found.");

  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] ?? null : appointment.patients ?? null;
  const provider = Array.isArray(appointment.providers) ? appointment.providers[0] ?? null : appointment.providers ?? null;

  if (!patient?.user_id || !provider?.user_id) {
    throw new Error("Appointment participants are incomplete.");
  }

  if (![patient.user_id, provider.user_id].includes(userId)) {
    throw new Error("You do not have access to this appointment conversation.");
  }

  const appointmentLabel = formatAppointmentLabel(appointment);
  const subject = defaultSubject(appointmentLabel);
  const now = new Date().toISOString();

  const { data: conversationRow, error: insertError } = await supabase
    .from("message_conversations")
    .insert({
      patient_user_id: patient.user_id,
      provider_user_id: provider.user_id,
      appointment_id: appointmentId,
      subject,
      updated_at: now,
      last_message_at: null,
    })
    .select("id")
    .single();

  if (insertError || !conversationRow) throw insertError ?? new Error("Could not create conversation.");

  await supabase.from("audit_logs").insert({
    actor_user_id: userId,
    actor_role: null,
    action: "conversation_created",
    entity_type: "message_conversation",
    entity_id: conversationRow.id,
    metadata_json: {
      appointment_id: appointmentId,
    },
  });

  return { conversationId: conversationRow.id as string, created: true };
}

export async function sendMessageInConversation(
  supabase: SupabaseClient,
  conversationId: string,
  senderUserId: string,
  body: string
) {
  const { data: conversation, error: conversationError } = await supabase
    .from("message_conversations")
    .select("id,patient_user_id,provider_user_id")
    .eq("id", conversationId)
    .or(`patient_user_id.eq.${senderUserId},provider_user_id.eq.${senderUserId}`)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("Conversation not found.");

  const recipientUserId =
    conversation.patient_user_id === senderUserId ? conversation.provider_user_id : conversation.patient_user_id;
  const now = new Date().toISOString();

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_user_id: senderUserId,
    recipient_user_id: recipientUserId,
    body: body.trim(),
  });

  if (messageError) throw messageError;

  await supabase
    .from("message_conversations")
    .update({ updated_at: now, last_message_at: now })
    .eq("id", conversationId);

  await supabase.from("audit_logs").insert({
    actor_user_id: senderUserId,
    actor_role: null,
    action: "message_sent",
    entity_type: "message_conversation",
    entity_id: conversationId,
    metadata_json: {},
  });

  const admin = createAdminClient();
  await createNotification(admin, {
    userId: recipientUserId,
    type: "message_received",
    title: conversation.provider_user_id === recipientUserId ? "New patient message" : "New provider message",
    body: body.trim().length > 120 ? `${body.trim().slice(0, 117)}...` : body.trim(),
    linkUrl:
      conversation.provider_user_id === recipientUserId
        ? `/provider/messages/${conversationId}`
        : `/portal/messages/${conversationId}`,
    metadata: {
      conversation_id: conversationId,
      sender_user_id: senderUserId,
    },
  });
}

export async function markConversationAsRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: now })
    .eq("conversation_id", conversationId)
    .eq("recipient_user_id", userId)
    .is("read_at", null);

  if (error) throw error;

  await supabase.from("audit_logs").insert({
    actor_user_id: userId,
    actor_role: null,
    action: "message_read",
    entity_type: "message_conversation",
    entity_id: conversationId,
    metadata_json: {},
  });
}
