import type { SupabaseClient } from "@supabase/supabase-js";
import { AppointmentRecord } from "@/lib/carebridge/types";

export type AppointmentStatus = "requested" | "confirmed" | "cancelled" | "completed" | "no_show";

export type AppointmentWithProvider = AppointmentRecord & {
  providers?: {
    id?: string | null;
    user_id?: string | null;
    slug?: string | null;
    display_name: string | null;
    credentials: string | null;
    specialty: string | null;
    organization_id?: string | null;
    organizations?: { name: string | null } | { name: string | null }[] | null;
  } | {
    id?: string | null;
    user_id?: string | null;
    slug?: string | null;
    display_name: string | null;
    credentials: string | null;
    specialty: string | null;
    organization_id?: string | null;
    organizations?: { name: string | null } | { name: string | null }[] | null;
  }[] | null;
};

export type AppointmentWithPatient = AppointmentRecord & {
  patients?: {
    id?: string | null;
    user_id?: string | null;
    legal_name: string | null;
    email: string | null;
    organization_id?: string | null;
    organizations?: { name: string | null } | { name: string | null }[] | null;
  } | {
    id?: string | null;
    user_id?: string | null;
    legal_name: string | null;
    email: string | null;
    organization_id?: string | null;
    organizations?: { name: string | null } | { name: string | null }[] | null;
  }[] | null;
};

export type AppointmentTimingState = {
  isTelehealth: boolean;
  canJoin: boolean;
  canManage: boolean;
  label: string;
  helperText: string | null;
};

export async function fetchAppointmentsForProvider(
  supabase: SupabaseClient,
  providerId: string,
  fromIso?: string
) {
  let query = supabase
    .from("appointments")
    .select("id,provider_id,patient_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder,patients(id,user_id,legal_name,email,organization_id,organizations(name))")
    .eq("provider_id", providerId)
    .order("start_time", { ascending: true });

  if (fromIso) {
    query = query.gte("start_time", fromIso);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AppointmentWithPatient[];
}

export async function fetchPublicBookedSlotsForProvider(
  supabase: SupabaseClient,
  providerId: string,
  fromIso?: string
) {
  const { data, error } = await supabase.rpc("get_public_provider_booked_slots", {
    target_provider_id: providerId,
    from_iso: fromIso ?? null,
  });

  if (error) throw error;
  return (data ?? []) as AppointmentRecord[];
}

export async function fetchAppointmentsForPatient(
  supabase: SupabaseClient,
  patientId: string
) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id,provider_id,patient_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder,providers(id,user_id,slug,display_name,credentials,specialty,organization_id,organizations(name))")
    .eq("patient_id", patientId)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AppointmentWithProvider[];
}

export async function fetchPatientAppointmentById(
  supabase: SupabaseClient,
  patientId: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id,provider_id,patient_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder,providers(id,user_id,slug,display_name,credentials,specialty,organization_id,organizations(name))")
    .eq("id", appointmentId)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as AppointmentWithProvider | null;
}

export async function fetchProviderAppointmentById(
  supabase: SupabaseClient,
  providerId: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id,provider_id,patient_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder,patients(id,user_id,legal_name,email,organization_id,organizations(name))")
    .eq("id", appointmentId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as AppointmentWithPatient | null;
}

export async function hasAppointmentConflict(
  supabase: SupabaseClient,
  providerId: string,
  startIso: string,
  endIso: string
) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id")
    .eq("provider_id", providerId)
    .in("status", ["requested", "confirmed"])
    .lt("start_time", endIso)
    .gt("end_time", startIso)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

export type BookingInput = {
  patientId: string;
  providerId: string;
  organizationId: string | null;
  appointmentType: string;
  startIso: string;
  endIso: string;
  timezone: string;
};

export async function createAppointment(
  supabase: SupabaseClient,
  input: BookingInput
) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: input.patientId,
      provider_id: input.providerId,
      organization_id: input.organizationId,
      status: "requested",
      appointment_type: input.appointmentType,
      start_time: input.startIso,
      end_time: input.endIso,
      timezone: input.timezone,
      visit_vendor: null,
      visit_external_id: null,
      join_url_placeholder: null,
    })
    .select("id,status,start_time,end_time,timezone")
    .single();

  if (error || !data) throw error ?? new Error("Could not create appointment.");
  return data as Pick<AppointmentRecord, "id" | "status" | "start_time" | "end_time" | "timezone">;
}

export async function updateAppointmentForPatient(
  supabase: SupabaseClient,
  patientId: string,
  appointmentId: string,
  updates: Partial<Pick<AppointmentRecord, "status" | "start_time" | "end_time" | "timezone" | "appointment_type">>
) {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId)
    .eq("patient_id", patientId)
    .select("id,status,start_time,end_time,timezone,appointment_type")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppointmentForProvider(
  supabase: SupabaseClient,
  providerId: string,
  appointmentId: string,
  updates: Partial<Pick<AppointmentRecord, "status" | "start_time" | "end_time" | "timezone" | "appointment_type">>
) {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId)
    .eq("provider_id", providerId)
    .select("id,status,start_time,end_time,timezone,appointment_type")
    .single();

  if (error) throw error;
  return data;
}

export function getAppointmentTimingState(
  appointment: Pick<AppointmentRecord, "appointment_type" | "status" | "start_time" | "end_time">,
  now = new Date()
): AppointmentTimingState {
  const isTelehealth = appointment.appointment_type === "telehealth";
  const activeStatuses = new Set(["requested", "confirmed"]);
  const nonJoinableStatuses = new Set(["cancelled", "completed", "no_show"]);

  if (!isTelehealth) {
    return {
      isTelehealth: false,
      canJoin: false,
      canManage: !nonJoinableStatuses.has(appointment.status),
      label: "Not a telehealth visit",
      helperText: "This appointment does not use the telehealth visit room.",
    };
  }

  if (nonJoinableStatuses.has(appointment.status)) {
    return {
      isTelehealth: true,
      canJoin: false,
      canManage: false,
      label: appointment.status === "cancelled" ? "Visit cancelled" : "Visit closed",
      helperText: "Telehealth entry is only available for active appointments.",
    };
  }

  const start = new Date(appointment.start_time).getTime();
  const end = new Date(appointment.end_time).getTime();
  const joinWindowStart = start - 15 * 60 * 1000;
  const nowMs = now.getTime();

  if (!activeStatuses.has(appointment.status)) {
    return {
      isTelehealth: true,
      canJoin: false,
      canManage: false,
      label: "Visit pending",
      helperText: "The visit can be launched after the appointment status is active.",
    };
  }

  if (nowMs < joinWindowStart) {
    return {
      isTelehealth: true,
      canJoin: false,
      canManage: true,
      label: "Visit not available yet",
      helperText: "Join opens 15 minutes before the scheduled start time.",
    };
  }

  if (nowMs > end) {
    return {
      isTelehealth: true,
      canJoin: false,
      canManage: false,
      label: "Visit window ended",
      helperText: "This appointment is outside the telehealth join window.",
    };
  }

  return {
    isTelehealth: true,
    canJoin: true,
    canManage: true,
    label: "Join visit",
    helperText: "Your telehealth visit is ready when you are.",
  };
}

export function formatAppointmentDateTime(
  appointment: Pick<AppointmentRecord, "start_time" | "timezone">
) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appointment.timezone,
  }).format(new Date(appointment.start_time));
}
