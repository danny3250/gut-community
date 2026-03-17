import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderVisitNoteRecord } from "@/lib/carebridge/types";

const NOTE_SELECT =
  "id,appointment_id,visit_id,patient_id,provider_id,status,subject,note_body,structured_notes,created_by_user_id,last_edited_by_user_id,version,created_at,updated_at,finalized_at";

export type ProviderVisitNoteInput = {
  appointmentId: string;
  visitId?: string | null;
  patientId: string;
  providerId: string;
  subject?: string | null;
  noteBody: string;
  structuredNotes?: Record<string, unknown>;
  status: "draft" | "finalized";
  editorUserId: string;
};

export async function fetchProviderVisitNoteForAppointment(
  supabase: SupabaseClient,
  providerId: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("provider_visit_notes")
    .select(NOTE_SELECT)
    .eq("provider_id", providerId)
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ProviderVisitNoteRecord | null;
}

export async function fetchProviderVisitNoteForVisit(
  supabase: SupabaseClient,
  providerId: string,
  visitId: string
) {
  const { data, error } = await supabase
    .from("provider_visit_notes")
    .select(NOTE_SELECT)
    .eq("provider_id", providerId)
    .eq("visit_id", visitId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ProviderVisitNoteRecord | null;
}

export async function upsertProviderVisitNote(
  supabase: SupabaseClient,
  input: ProviderVisitNoteInput
) {
  const existing = await fetchProviderVisitNoteForAppointment(supabase, input.providerId, input.appointmentId);
  const now = new Date().toISOString();

  const payload = {
    visit_id: input.visitId ?? null,
    patient_id: input.patientId,
    provider_id: input.providerId,
    subject: normalizeOptionalText(input.subject),
    note_body: input.noteBody.trim(),
    structured_notes: input.structuredNotes ?? {},
    status: input.status,
    last_edited_by_user_id: input.editorUserId,
    updated_at: now,
    finalized_at: input.status === "finalized" ? now : null,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("provider_visit_notes")
      .update({
        ...payload,
        version: (existing.version ?? 1) + 1,
      })
      .eq("id", existing.id)
      .select(NOTE_SELECT)
      .single();

    if (error || !data) throw error ?? new Error("Could not update note.");
    return {
      note: data as ProviderVisitNoteRecord,
      created: false,
      previousStatus: existing.status,
    };
  }

  const { data, error } = await supabase
    .from("provider_visit_notes")
    .insert({
      appointment_id: input.appointmentId,
      created_by_user_id: input.editorUserId,
      version: 1,
      ...payload,
    })
    .select(NOTE_SELECT)
    .single();

  if (error || !data) throw error ?? new Error("Could not create note.");
  return {
    note: data as ProviderVisitNoteRecord,
    created: true,
    previousStatus: null,
  };
}

export async function fetchRecentProviderNotesForPatient(
  supabase: SupabaseClient,
  providerId: string,
  patientId: string,
  limit = 5
) {
  const { data, error } = await supabase
    .from("provider_visit_notes")
    .select(`${NOTE_SELECT},appointments(id,start_time,timezone,appointment_type,status)`)
    .eq("provider_id", providerId)
    .eq("patient_id", patientId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as (ProviderVisitNoteRecord & {
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
  })[];
}

export function getProviderVisitNotePreview(noteBody: string, length = 140) {
  const compact = noteBody.replace(/\s+/g, " ").trim();
  if (compact.length <= length) return compact;
  return `${compact.slice(0, length).trimEnd()}...`;
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
