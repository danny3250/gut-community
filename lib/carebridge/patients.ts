import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function getOrCreatePatientRecord(supabase: SupabaseClient, user: User) {
  const { data: existing, error: existingError } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null }>();

  const { data: created, error: createError } = await supabase
    .from("patients")
    .insert({
      user_id: user.id,
      legal_name: profile?.display_name ?? user.email ?? "CareBridge Patient",
      email: user.email ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (createError || !created) throw createError ?? new Error("Could not create patient record.");
  return created.id;
}

export async function fetchPatientByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("id,user_id,state,organization_id")
    .eq("user_id", userId)
    .maybeSingle<{ id: string; user_id: string; state: string | null; organization_id: string | null }>();

  if (error) throw error;
  return data ?? null;
}
