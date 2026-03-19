import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatientFollowUpSummaryRecord } from "@/lib/carebridge/types";

const FOLLOW_UP_SELECT =
  "id,appointment_id,visit_id,patient_id,provider_id,follow_up_title,follow_up_summary,follow_up_instructions,what_to_track,recommended_next_step,status,published_at,created_by_user_id,last_edited_by_user_id,created_at,updated_at";

export type PatientFollowUpInput = {
  appointmentId: string;
  visitId?: string | null;
  patientId: string;
  providerId: string;
  followUpTitle?: string | null;
  followUpSummary: string;
  followUpInstructions?: string | null;
  whatToTrack?: string | null;
  recommendedNextStep?: string | null;
  status: "draft" | "published";
  editorUserId: string;
};

export type PatientFollowUpWithContext = PatientFollowUpSummaryRecord & {
  appointments?:
    | {
        id: string;
        start_time: string;
        timezone: string;
        appointment_type: string;
        status: string;
      }
    | {
        id: string;
        start_time: string;
        timezone: string;
        appointment_type: string;
        status: string;
      }[]
    | null;
  providers?:
    | {
        id: string;
        slug: string | null;
        display_name: string | null;
        credentials: string | null;
        specialty: string | null;
      }
    | {
        id: string;
        slug: string | null;
        display_name: string | null;
        credentials: string | null;
        specialty: string | null;
      }[]
    | null;
};

export async function fetchProviderFollowUpForAppointment(
  supabase: SupabaseClient,
  providerId: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("patient_follow_up_summaries")
    .select(FOLLOW_UP_SELECT)
    .eq("provider_id", providerId)
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PatientFollowUpSummaryRecord | null;
}

export async function fetchPatientFollowUpForAppointment(
  supabase: SupabaseClient,
  patientId: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("patient_follow_up_summaries")
    .select(FOLLOW_UP_SELECT)
    .eq("patient_id", patientId)
    .eq("appointment_id", appointmentId)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PatientFollowUpSummaryRecord | null;
}

export async function fetchRecentPublishedFollowUpsForPatient(
  supabase: SupabaseClient,
  patientId: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from("patient_follow_up_summaries")
    .select(`${FOLLOW_UP_SELECT},appointments(id,start_time,timezone,appointment_type,status),providers(id,slug,display_name,credentials,specialty)`)
    .eq("patient_id", patientId)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PatientFollowUpWithContext[];
}

export async function upsertPatientFollowUpSummary(
  supabase: SupabaseClient,
  input: PatientFollowUpInput
) {
  const existing = await fetchProviderFollowUpForAppointment(supabase, input.providerId, input.appointmentId);
  const now = new Date().toISOString();

  const payload = {
    visit_id: input.visitId ?? null,
    patient_id: input.patientId,
    provider_id: input.providerId,
    follow_up_title: normalizeOptionalText(input.followUpTitle),
    follow_up_summary: input.followUpSummary.trim(),
    follow_up_instructions: normalizeOptionalText(input.followUpInstructions),
    what_to_track: normalizeOptionalText(input.whatToTrack),
    recommended_next_step: normalizeOptionalText(input.recommendedNextStep),
    status: input.status,
    published_at: input.status === "published" ? now : null,
    last_edited_by_user_id: input.editorUserId,
    updated_at: now,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("patient_follow_up_summaries")
      .update(payload)
      .eq("id", existing.id)
      .select(FOLLOW_UP_SELECT)
      .single();

    if (error || !data) throw error ?? new Error("Could not update follow-up summary.");
    return {
      followUp: data as PatientFollowUpSummaryRecord,
      created: false,
      previousStatus: existing.status,
    };
  }

  const { data, error } = await supabase
    .from("patient_follow_up_summaries")
    .insert({
      appointment_id: input.appointmentId,
      created_by_user_id: input.editorUserId,
      ...payload,
    })
    .select(FOLLOW_UP_SELECT)
    .single();

  if (error || !data) throw error ?? new Error("Could not create follow-up summary.");
  return {
    followUp: data as PatientFollowUpSummaryRecord,
    created: true,
    previousStatus: null,
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
