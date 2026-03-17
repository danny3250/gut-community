import type { SupabaseClient } from "@supabase/supabase-js";
import { ProviderAvailabilityRecord, ProviderDirectoryRecord } from "@/lib/carebridge/types";

export type ProviderVerificationStatus = "draft" | "pending" | "verified" | "rejected" | "suspended";

type ProviderRow = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  slug: string | null;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  bio: string | null;
  states_served: string[] | null;
  license_states: string[] | null;
  telehealth_enabled: boolean | null;
  areas_of_care: string[] | null;
  visit_types: string[] | null;
  verification_status: ProviderVerificationStatus | null;
  verification_submitted_at: string | null;
  verified_at: string | null;
  verified_by_user_id: string | null;
  rejection_reason: string | null;
  license_number: string | null;
  npi_number: string | null;
  onboarding_completed: boolean | null;
  is_accepting_patients: boolean | null;
  organizations?: { name: string | null; slug?: string | null } | { name: string | null; slug?: string | null }[] | null;
};

const PROVIDER_SELECT =
  "id,user_id,organization_id,slug,display_name,credentials,specialty,bio,states_served,license_states,telehealth_enabled,areas_of_care,visit_types,verification_status,verification_submitted_at,verified_at,verified_by_user_id,rejection_reason,license_number,npi_number,onboarding_completed,is_accepting_patients,organizations(name,slug)";

export async function fetchPublicProviders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("verification_status", "verified")
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProviderRow[]).map(normalizeProviderRow);
}

export async function fetchAllProvidersForAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProviderRow[]).map(normalizeProviderRow);
}

export async function fetchProviderBySlug(supabase: SupabaseClient, slug: string) {
  const normalizedSlug = slugifyProviderName(slug);
  const providers = await fetchPublicProviders(supabase);
  return providers.find((provider) => provider.slug === normalizedSlug) ?? null;
}

export async function fetchProviderByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeProviderRow(data as ProviderRow) : null;
}

export async function fetchProviderById(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
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

export function isProviderVerified(provider: Pick<ProviderDirectoryRecord, "verification_status"> | null | undefined) {
  return provider?.verification_status === "verified";
}

export function canProviderAcceptBookings(provider: ProviderDirectoryRecord | null | undefined) {
  return Boolean(provider && isProviderVerified(provider) && provider.is_accepting_patients !== false);
}

export function getProviderVerificationMessage(provider: ProviderDirectoryRecord | null | undefined) {
  if (!provider) return null;

  switch (provider.verification_status) {
    case "pending":
      return "Your profile is under review. Public listing and bookings will activate after verification.";
    case "rejected":
      return provider.rejection_reason || "Your application was not approved yet. Review your details and resubmit when ready.";
    case "suspended":
      return "Your provider access is currently suspended. Public listing, bookings, and provider actions are disabled.";
    case "verified":
      return "Your provider profile has been verified and is now visible to patients.";
    default:
      return "Complete your provider profile to begin verification.";
  }
}

function normalizeProviderRow(row: ProviderRow): ProviderDirectoryRecord {
  const organization = Array.isArray(row.organizations) ? row.organizations[0] ?? null : row.organizations ?? null;
  const normalizedSlug = slugifyProviderName(row.slug ?? row.display_name);

  return {
    id: row.id,
    user_id: row.user_id,
    organization_id: row.organization_id ?? null,
    slug: normalizedSlug,
    display_name: row.display_name,
    credentials: row.credentials,
    specialty: row.specialty,
    bio: row.bio,
    states_served: row.states_served ?? [],
    license_states: row.license_states ?? [],
    telehealth_enabled: row.telehealth_enabled ?? false,
    areas_of_care: row.areas_of_care ?? [],
    visit_types: row.visit_types ?? [],
    verification_status: row.verification_status ?? "draft",
    verification_submitted_at: row.verification_submitted_at,
    verified_at: row.verified_at,
    verified_by_user_id: row.verified_by_user_id,
    rejection_reason: row.rejection_reason,
    license_number: row.license_number,
    npi_number: row.npi_number,
    onboarding_completed: row.onboarding_completed ?? false,
    is_accepting_patients: row.is_accepting_patients ?? false,
    organization: organization ? { name: organization.name, slug: organization.slug ?? null } : null,
  };
}

export function slugifyProviderName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
