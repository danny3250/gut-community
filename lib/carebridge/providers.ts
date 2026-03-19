import type { SupabaseClient } from "@supabase/supabase-js";
import { ProviderApplicationRecord, ProviderAvailabilityRecord, ProviderDirectoryRecord } from "@/lib/carebridge/types";

export type ProviderVerificationStatus = "draft" | "pending" | "verified" | "rejected" | "suspended";
export type PublicProviderFilters = {
  query?: string;
  organization?: string;
  specialty?: string;
  condition?: string;
  state?: string;
  telehealthOnly?: boolean;
};

type ProviderRow = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  slug: string | null;
  display_name: string | null;
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
  provider_specialties?:
    | { specialties?: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null }[]
    | null;
  provider_condition_focus?:
    | { conditions?: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null }[]
    | null;
  organizations?: { name: string | null; slug?: string | null } | { name: string | null; slug?: string | null }[] | null;
};

type ProviderApplicationStatus = "pending" | "approved" | "rejected";

type ProviderApplicationRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  specialty_slugs: string[] | null;
  condition_focus_slugs: string[] | null;
  bio: string | null;
  states_served: string[] | null;
  license_states: string[] | null;
  telehealth_enabled: boolean | null;
  organization_id: string | null;
  license_number: string | null;
  npi_number: string | null;
  is_accepting_patients: boolean | null;
  status: ProviderApplicationStatus | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

const PROVIDER_SELECT =
  "id,user_id,organization_id,slug,display_name,credentials,specialty,bio,states_served,license_states,telehealth_enabled,areas_of_care,visit_types,verification_status,verification_submitted_at,verified_at,verified_by_user_id,rejection_reason,license_number,npi_number,onboarding_completed,is_accepting_patients,provider_specialties(specialties(name,slug)),provider_condition_focus(conditions(name,slug)),organizations(name,slug)";
const PROVIDER_APPLICATION_SELECT =
  "id,user_id,full_name,display_name,credentials,specialty,specialty_slugs,condition_focus_slugs,bio,states_served,license_states,telehealth_enabled,organization_id,license_number,npi_number,is_accepting_patients,status,submitted_at,reviewed_at,reviewed_by_user_id,rejection_reason,created_at,updated_at";

export async function fetchPublicProviders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("verification_status", "verified")
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProviderRow[])
    .map((row) => normalizeProviderRow(row, { requirePublicProfile: true }))
    .filter((provider): provider is ProviderDirectoryRecord => Boolean(provider));
}

export async function getPublicProviders(supabase: SupabaseClient, filters: PublicProviderFilters = {}) {
  const providers = await fetchPublicProviders(supabase);
  return filterProviders(providers, filters);
}

export async function fetchAllProvidersForAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProviderRow[])
    .map((row) => normalizeProviderRow(row))
    .filter((provider): provider is ProviderDirectoryRecord => Boolean(provider));
}

export async function fetchProviderApplicationByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("provider_applications")
    .select(PROVIDER_APPLICATION_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingProviderApplicationsTableError(error)) {
      return null;
    }
    throw error;
  }
  if (!data) return null;

  const activeProvider = await fetchProviderByUserId(supabase, userId).catch(() => null);
  const organizationsById = await fetchOrganizationsById(
    supabase,
    [((data as ProviderApplicationRow).organization_id ?? null)].filter((value): value is string => Boolean(value))
  );

  return normalizeProviderApplicationRow(data as ProviderApplicationRow, activeProvider, organizationsById);
}

export async function fetchProviderApplicationsForAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("provider_applications")
    .select(PROVIDER_APPLICATION_SELECT)
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingProviderApplicationsTableError(error)) {
      return [];
    }
    throw error;
  }
  const applicationRows = (data ?? []) as ProviderApplicationRow[];
  const userIds = Array.from(new Set(applicationRows.map((row) => row.user_id)));
  const organizationIds = Array.from(
    new Set(applicationRows.map((row) => row.organization_id).filter((value): value is string => Boolean(value)))
  );
  const activeProviderMap = new Map<string, ProviderDirectoryRecord>();
  const organizationsById = await fetchOrganizationsById(supabase, organizationIds);

  if (userIds.length > 0) {
    const { data: providerRows, error: providerError } = await supabase
      .from("providers")
      .select(PROVIDER_SELECT)
      .in("user_id", userIds);

    if (providerError) throw providerError;

    for (const row of (providerRows ?? []) as ProviderRow[]) {
      const normalizedProvider = normalizeProviderRow(row);
      if (normalizedProvider) {
        activeProviderMap.set(row.user_id, normalizedProvider);
      }
    }
  }

  return applicationRows.map((row) =>
    normalizeProviderApplicationRow(row, activeProviderMap.get(row.user_id) ?? null, organizationsById)
  );
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

export async function fetchProviderScopeOptions(supabase: SupabaseClient) {
  const [{ data: specialties, error: specialtiesError }, { data: conditions, error: conditionsError }] = await Promise.all([
    supabase.from("specialties").select("id,name,slug,category").order("name", { ascending: true }),
    supabase.from("conditions").select("id,name,slug,category").order("name", { ascending: true }),
  ]);

  if (specialtiesError) throw specialtiesError;
  if (conditionsError) throw conditionsError;

  return {
    specialties: (specialties ?? []) as Array<{ id: string; name: string; slug: string; category: string }>,
    conditions: (conditions ?? []) as Array<{ id: string; name: string; slug: string; category: string }>,
  };
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

export async function getProvidersForConditions(
  supabase: SupabaseClient,
  conditions: string[],
  state?: string,
  telehealthOnly = true
) {
  const normalizedConditions = normalizeStringArray(conditions);
  const providers = await fetchPublicProviders(supabase);

  return providers
    .filter((provider) => {
      if (telehealthOnly && !provider.telehealth_enabled) return false;
      if (state && !provider.states_served.includes(state)) return false;
      return (
        normalizedConditions.length === 0 ||
        normalizedConditions.some(
          (condition) =>
            provider.condition_focus.some((focus) => focus.toLowerCase() === condition.toLowerCase()) ||
            provider.areas_of_care?.some((area) => area.toLowerCase() === condition.toLowerCase())
        )
      );
    })
    .sort((left, right) => getProviderMatchScore(right, normalizedConditions, state) - getProviderMatchScore(left, normalizedConditions, state));
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

export function getProviderApplicationMessage(application: ProviderApplicationRecord | null | undefined) {
  if (!application) return "Complete your provider profile to begin verification.";

  switch (application.status) {
    case "pending":
      return "Your provider application is under review. Public listing and bookings will activate after approval.";
    case "rejected":
      return application.rejection_reason || "Your application was not approved at this time. Review the notes and update your information to resubmit.";
    case "approved":
      return "Your provider application has been approved.";
    default:
      return "Complete your provider profile to begin verification.";
  }
}

export function hasActiveProviderAccess(provider: ProviderDirectoryRecord | null | undefined) {
  return Boolean(provider && provider.verification_status === "verified");
}

export function filterProviders(providers: ProviderDirectoryRecord[], filters: PublicProviderFilters = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const organization = filters.organization?.trim() ?? "";
  const specialty = filters.specialty?.trim() ?? "";
  const condition = filters.condition?.trim() ?? "";
  const state = filters.state?.trim() ?? "";
  const telehealthOnly = filters.telehealthOnly ?? false;

  return providers
    .filter((provider) => {
      if (query) {
        const haystack = [
          provider.display_name,
          provider.credentials,
          provider.specialty,
          provider.bio,
          provider.organization?.name,
          ...provider.specialties,
          ...provider.condition_focus,
          ...(provider.areas_of_care ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (organization && provider.organization?.name !== organization) return false;
      if (specialty && !provider.specialties.includes(specialty)) return false;
      if (condition && !provider.condition_focus.includes(condition) && !(provider.areas_of_care ?? []).includes(condition)) return false;
      if (state && !provider.states_served.includes(state)) return false;
      if (telehealthOnly && !provider.telehealth_enabled) return false;
      return true;
    })
    .sort((left, right) => left.display_name.localeCompare(right.display_name));
}

export async function syncProviderScopeForApprovedProvider(
  supabase: SupabaseClient,
  providerId: string,
  specialtySlugs: string[],
  conditionFocusSlugs: string[]
) {
  const normalizedSpecialtySlugs = normalizeStringArray(specialtySlugs);
  const normalizedConditionSlugs = normalizeStringArray(conditionFocusSlugs);

  const [{ data: specialties, error: specialtiesError }, { data: conditions, error: conditionsError }] = await Promise.all([
    normalizedSpecialtySlugs.length
      ? supabase.from("specialties").select("id,name,slug").in("slug", normalizedSpecialtySlugs)
      : Promise.resolve({ data: [], error: null }),
    normalizedConditionSlugs.length
      ? supabase.from("conditions").select("id,name,slug").in("slug", normalizedConditionSlugs)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (specialtiesError) throw specialtiesError;
  if (conditionsError) throw conditionsError;

  await supabase.from("provider_specialties").delete().eq("provider_id", providerId);
  await supabase.from("provider_condition_focus").delete().eq("provider_id", providerId);

  const specialtyRows = (specialties ?? []) as Array<{ id: string; name: string; slug: string }>;
  const conditionRows = (conditions ?? []) as Array<{ id: string; name: string; slug: string }>;

  if (specialtyRows.length > 0) {
    const { error } = await supabase.from("provider_specialties").insert(
      specialtyRows.map((specialty) => ({
        provider_id: providerId,
        specialty_id: specialty.id,
      }))
    );
    if (error) throw error;
  }

  if (conditionRows.length > 0) {
    const { error } = await supabase.from("provider_condition_focus").insert(
      conditionRows.map((condition) => ({
        provider_id: providerId,
        condition_id: condition.id,
      }))
    );
    if (error) throw error;
  }

  const specialtyNames = specialtyRows.map((specialty) => specialty.name);
  const focusNames = conditionRows.map((condition) => condition.name);

  const { error: providerUpdateError } = await supabase
    .from("providers")
    .update({
      specialty: specialtyNames[0] ?? null,
      areas_of_care: Array.from(new Set([...specialtyNames, ...focusNames])),
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);

  if (providerUpdateError) throw providerUpdateError;
}

function normalizeProviderRow(
  row: ProviderRow,
  options?: { requirePublicProfile?: boolean }
): ProviderDirectoryRecord | null {
  const organization = Array.isArray(row.organizations) ? row.organizations[0] ?? null : row.organizations ?? null;
  const displayName = normalizeOptionalText(row.display_name);
  const normalizedSlug = slugifyProviderName(row.slug ?? displayName ?? "");
  const verificationStatus = row.verification_status ?? "draft";
  const specialties = normalizeJoinedNames(row.provider_specialties, "specialties");
  const conditionFocus = normalizeJoinedNames(row.provider_condition_focus, "conditions");
  const areasOfCare = normalizeStringArray(row.areas_of_care);

  if (options?.requirePublicProfile && (verificationStatus !== "verified" || !displayName || !normalizedSlug)) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    organization_id: row.organization_id ?? null,
    slug: normalizedSlug || `provider-${row.id.slice(0, 8)}`,
    display_name: displayName || "CareBridge Provider",
    credentials: normalizeOptionalText(row.credentials),
    specialty: normalizeOptionalText(row.specialty) ?? specialties[0] ?? null,
    specialties,
    condition_focus: conditionFocus,
    bio: normalizeOptionalText(row.bio),
    states_served: normalizeStringArray(row.states_served),
    license_states: normalizeStringArray(row.license_states),
    telehealth_enabled: row.telehealth_enabled ?? false,
    areas_of_care: Array.from(new Set([...(areasOfCare ?? []), ...specialties, ...conditionFocus])),
    visit_types: normalizeStringArray(row.visit_types),
    verification_status: verificationStatus,
    verification_submitted_at: row.verification_submitted_at,
    verified_at: row.verified_at,
    verified_by_user_id: row.verified_by_user_id,
    rejection_reason: normalizeOptionalText(row.rejection_reason),
    license_number: normalizeOptionalText(row.license_number),
    npi_number: normalizeOptionalText(row.npi_number),
    onboarding_completed: row.onboarding_completed ?? false,
    is_accepting_patients: row.is_accepting_patients ?? false,
    organization: organization ? { name: normalizeOptionalText(organization.name), slug: normalizeOptionalText(organization.slug) } : null,
  };
}

function getProviderMatchScore(
  provider: ProviderDirectoryRecord,
  normalizedConditions: string[],
  state?: string
) {
  let score = 0;
  if (state && provider.states_served.includes(state)) score += 3;
  if (provider.telehealth_enabled) score += 2;
  score += normalizedConditions.filter((condition) =>
    provider.condition_focus.some((focus) => focus.toLowerCase() === condition.toLowerCase())
  ).length * 4;
  score += normalizedConditions.filter((condition) =>
    provider.specialties.some((specialty) => specialty.toLowerCase().includes(condition.toLowerCase()))
  ).length * 2;
  score += normalizedConditions.filter((condition) =>
    (provider.areas_of_care ?? []).some((area) => area.toLowerCase().includes(condition.toLowerCase()))
  ).length;
  return score;
}

function normalizeProviderApplicationRow(
  row: ProviderApplicationRow,
  activeProvider: ProviderDirectoryRecord | null,
  organizationsById: Map<string, { name: string | null; slug: string | null }>
): ProviderApplicationRecord {
  const organization = row.organization_id ? organizationsById.get(row.organization_id) ?? null : null;

  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    display_name: row.display_name,
    credentials: row.credentials,
    specialty: row.specialty,
    specialty_slugs: normalizeStringArray(row.specialty_slugs),
    condition_focus_slugs: normalizeStringArray(row.condition_focus_slugs),
    bio: row.bio,
    states_served: row.states_served ?? [],
    license_states: row.license_states ?? [],
    telehealth_enabled: row.telehealth_enabled ?? true,
    organization_id: row.organization_id ?? null,
    license_number: row.license_number,
    npi_number: row.npi_number,
    is_accepting_patients: row.is_accepting_patients ?? false,
    status: row.status ?? "pending",
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    reviewed_by_user_id: row.reviewed_by_user_id,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    organization: organization ? { name: organization.name, slug: organization.slug ?? null } : null,
    active_provider: activeProvider,
  };
}

export function slugifyProviderName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0);
}

function normalizeJoinedNames(
  rows:
    | {
        [key: string]:
          | { name: string | null; slug: string | null }
          | { name: string | null; slug: string | null }[]
          | null
          | undefined;
      }[]
    | null
    | undefined,
  relationKey: string
) {
  if (!Array.isArray(rows)) return [];

  const names: string[] = [];
  for (const row of rows) {
    const relation = row[relationKey];
    const record = Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
    const name = normalizeOptionalText(record?.name);
    if (name) names.push(name);
  }

  return Array.from(new Set(names));
}

async function fetchOrganizationsById(supabase: SupabaseClient, organizationIds: string[]) {
  const normalizedIds = Array.from(new Set(organizationIds.filter(Boolean)));
  const organizationsById = new Map<string, { name: string | null; slug: string | null }>();

  if (normalizedIds.length === 0) {
    return organizationsById;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .in("id", normalizedIds);

  if (error) throw error;

  for (const organization of (data ?? []) as OrganizationRow[]) {
    organizationsById.set(organization.id, {
      name: normalizeOptionalText(organization.name),
      slug: normalizeOptionalText(organization.slug),
    });
  }

  return organizationsById;
}

function isMissingProviderApplicationsTableError(error: { code?: string | null; message?: string | null }) {
  return error.code === "PGRST205" && (error.message ?? "").includes("public.provider_applications");
}
