import type { SupabaseClient } from "@supabase/supabase-js";
import { AppointmentRecord } from "@/lib/carebridge/types";

export async function fetchAppointmentsForProvider(
  supabase: SupabaseClient,
  providerId: string,
  fromIso?: string
) {
  let query = supabase
    .from("appointments")
    .select("id,provider_id,patient_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder,patients(legal_name,email)")
    .eq("provider_id", providerId)
    .order("start_time", { ascending: true });

  if (fromIso) {
    query = query.gte("start_time", fromIso);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
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
    .select("id,provider_id,patient_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder,providers(display_name,credentials,specialty)")
    .eq("patient_id", patientId)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data ?? [];
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
    .select("id,status,start_time,end_time")
    .single();

  if (error || !data) throw error ?? new Error("Could not create appointment.");
  return data as Pick<AppointmentRecord, "id" | "status" | "start_time" | "end_time">;
}
