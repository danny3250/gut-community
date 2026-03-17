import type { SupabaseClient } from "@supabase/supabase-js";
import { ProviderAvailabilityRecord, ProviderDirectoryRecord } from "@/lib/carebridge/types";

type ProviderRow = {
  id: string;
  organization_id?: string | null;
  slug: string | null;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  bio: string | null;
  states_served: string[] | null;
  telehealth_enabled: boolean | null;
  areas_of_care: string[] | null;
  visit_types: string[] | null;
  organizations?: { name: string | null; slug?: string | null } | { name: string | null; slug?: string | null }[] | null;
};

export async function fetchPublicProviders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("providers")
    .select("id,organization_id,slug,display_name,credentials,specialty,bio,states_served,telehealth_enabled,areas_of_care,visit_types,organizations(name,slug)")
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProviderRow[]).map(normalizeProviderRow);
}

export async function fetchProviderBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("providers")
    .select("id,organization_id,slug,display_name,credentials,specialty,bio,states_served,telehealth_enabled,areas_of_care,visit_types,organizations(name,slug)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeProviderRow(data as ProviderRow);
}

export async function fetchProviderByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select("id,organization_id,slug,display_name,credentials,specialty,bio,states_served,telehealth_enabled,areas_of_care,visit_types,organizations(name,slug)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeProviderRow(data as ProviderRow) : null;
}

export async function fetchProviderById(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select("id,organization_id,slug,display_name,credentials,specialty,bio,states_served,telehealth_enabled,areas_of_care,visit_types,organizations(name,slug)")
    .eq("id", providerId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeProviderRow(data as ProviderRow) : null;
}

export async function fetchProviderAvailability(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("provider_availability_windows")
    .select("id,provider_id,day_of_week,weekday,start_local_time,end_local_time,timezone,slot_duration_minutes")
    .eq("provider_id", providerId)
    .order("day_of_week", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProviderAvailabilityRecord[];
}

function normalizeProviderRow(row: ProviderRow): ProviderDirectoryRecord {
  const organization = Array.isArray(row.organizations) ? row.organizations[0] ?? null : row.organizations ?? null;

  return {
    id: row.id,
    organization_id: row.organization_id ?? null,
    slug: row.slug ?? row.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    display_name: row.display_name,
    credentials: row.credentials,
    specialty: row.specialty,
    bio: row.bio,
    states_served: row.states_served ?? [],
    telehealth_enabled: row.telehealth_enabled ?? false,
    areas_of_care: row.areas_of_care ?? [],
    visit_types: row.visit_types ?? [],
    organization: organization ? { name: organization.name, slug: organization.slug ?? null } : null,
  };
}
