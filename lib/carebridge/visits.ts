import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchVisitWithContext(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from("visits")
    .select(
      "id,appointment_id,patient_id,provider_id,status,visit_vendor,vendor_session_id,patient_join_token,provider_join_token,join_url_patient,join_url_provider,patient_joined_at,provider_joined_at,started_at,ended_at,created_at,updated_at,appointments(id,appointment_type,start_time,end_time,timezone,status),patients(id,user_id,legal_name,email),providers(id,user_id,display_name,credentials,specialty)"
    )
    .eq("id", visitId)
    .single();

  if (error || !data) {
    throw error ?? new Error("Visit not found.");
  }

  return data;
}
