import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "appointment_booked"
  | "appointment_reminder"
  | "appointment_cancelled"
  | "appointment_rescheduled"
  | "telehealth_ready"
  | "forms_required"
  | "forms_submitted"
  | "provider_application_received"
  | "provider_verified"
  | "provider_rejected"
  | "provider_suspended"
  | "message_received"
  | "document_uploaded"
  | "care_summary_available";

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
  read_at: string | null;
  scheduled_for: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
  scheduledFor?: string | null;
  metadata?: Record<string, unknown>;
};

const NOTIFICATION_SELECT =
  "id,user_id,type,title,body,link_url,is_read,read_at,scheduled_for,metadata_json,created_at";

export async function createNotification(supabase: SupabaseClient, input: NotificationInput) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link_url: input.linkUrl ?? null,
      scheduled_for: input.scheduledFor ?? new Date().toISOString(),
      metadata_json: input.metadata ?? {},
    })
    .select(NOTIFICATION_SELECT)
    .single();

  if (error || !data) throw error ?? new Error("Could not create notification.");
  return data as NotificationRecord;
}

export async function createNotifications(supabase: SupabaseClient, inputs: NotificationInput[]) {
  if (inputs.length === 0) return [] as NotificationRecord[];

  const { data, error } = await supabase
    .from("notifications")
    .insert(
      inputs.map((input) => ({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link_url: input.linkUrl ?? null,
        scheduled_for: input.scheduledFor ?? new Date().toISOString(),
        metadata_json: input.metadata ?? {},
      }))
    )
    .select(NOTIFICATION_SELECT);

  if (error) throw error;
  return (data ?? []) as NotificationRecord[];
}

export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 25
) {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", userId)
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as NotificationRecord[];
}

export async function getUnreadNotificationCount(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .lte("scheduled_for", new Date().toISOString());

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: now,
    })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: now,
    })
    .eq("user_id", userId)
    .eq("is_read", false)
    .lte("scheduled_for", now);

  if (error) throw error;
}

export function formatNotificationTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildAppointmentReminderSchedule(startIso: string) {
  const startMs = new Date(startIso).getTime();
  const checkpoints = [
    { offsetMs: 24 * 60 * 60 * 1000, kind: "appointment_reminder" as const, label: "24 hours" },
    { offsetMs: 60 * 60 * 1000, kind: "appointment_reminder" as const, label: "1 hour" },
    { offsetMs: 15 * 60 * 1000, kind: "telehealth_ready" as const, label: "15 minutes" },
  ];

  return checkpoints
    .map((checkpoint) => ({
      type: checkpoint.kind,
      scheduledFor: new Date(startMs - checkpoint.offsetMs).toISOString(),
      label: checkpoint.label,
    }))
    .filter((item) => new Date(item.scheduledFor).getTime() > Date.now());
}
