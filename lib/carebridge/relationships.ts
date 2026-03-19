import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatientProviderRelationshipRecord } from "@/lib/carebridge/types";
import type { ProviderDirectoryRecord } from "@/lib/carebridge/types";

type RelationshipRow = {
  id: string;
  patient_id: string;
  provider_id: string;
  status: "booked" | "active" | "past" | string;
  is_primary: boolean;
  is_favorite: boolean;
  first_appointment_at: string | null;
  last_appointment_at: string | null;
  created_at: string;
  updated_at: string;
  providers?:
    | {
    id: string;
    user_id: string | null;
    organization_id: string | null;
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
    verification_status: string | null;
    verification_submitted_at: string | null;
    verified_at: string | null;
    verified_by_user_id: string | null;
    rejection_reason: string | null;
    license_number: string | null;
    npi_number: string | null;
    onboarding_completed: boolean | null;
    is_accepting_patients: boolean | null;
    organizations?: { name: string | null; slug?: string | null } | { name: string | null; slug?: string | null }[] | null;
    provider_specialties?:
      | { specialties?: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null }[]
      | null;
    provider_condition_focus?:
      | { conditions?: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null }[]
      | null;
  }
    | {
        id: string;
        user_id: string | null;
        organization_id: string | null;
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
        verification_status: string | null;
        verification_submitted_at: string | null;
        verified_at: string | null;
        verified_by_user_id: string | null;
        rejection_reason: string | null;
        license_number: string | null;
        npi_number: string | null;
        onboarding_completed: boolean | null;
        is_accepting_patients: boolean | null;
        organizations?: { name: string | null; slug?: string | null } | { name: string | null; slug?: string | null }[] | null;
        provider_specialties?:
          | { specialties?: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null }[]
          | null;
        provider_condition_focus?:
          | { conditions?: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null }[]
          | null;
      }[]
    | null;
  patients?:
    | {
    id: string;
    user_id: string | null;
    legal_name: string | null;
    email: string | null;
  }
    | {
        id: string;
        user_id: string | null;
        legal_name: string | null;
        email: string | null;
      }[]
    | null;
};

type AppointmentAggregateRow = {
  status: string;
  start_time: string;
  end_time: string;
};

const RELATIONSHIP_SELECT =
  "id,patient_id,provider_id,status,is_primary,is_favorite,first_appointment_at,last_appointment_at,created_at,updated_at,providers(id,user_id,organization_id,slug,display_name,credentials,specialty,bio,states_served,license_states,telehealth_enabled,areas_of_care,visit_types,verification_status,verification_submitted_at,verified_at,verified_by_user_id,rejection_reason,license_number,npi_number,onboarding_completed,is_accepting_patients,provider_specialties(specialties(name,slug)),provider_condition_focus(conditions(name,slug)),organizations(name,slug)),patients(id,user_id,legal_name,email)";

export async function ensurePatientProviderRelationship(
  supabase: SupabaseClient,
  patientId: string,
  providerId: string,
  initialStatus: "booked" | "active" | "past" = "booked"
) {
  const { data, error } = await supabase
    .from("patient_provider_relationships")
    .upsert(
      {
        patient_id: patientId,
        provider_id: providerId,
        status: initialStatus,
      },
      { onConflict: "patient_id,provider_id" }
    )
    .select("id,patient_id,provider_id,status,is_primary,is_favorite,first_appointment_at,last_appointment_at,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingRelationshipsTableError(error)) return null;
    throw error;
  }
  return data as PatientProviderRelationshipRecord;
}

export async function syncPatientProviderRelationship(
  supabase: SupabaseClient,
  patientId: string,
  providerId: string
) {
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("status,start_time,end_time")
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  if (appointmentsError) throw appointmentsError;

  const rows = (appointments ?? []) as AppointmentAggregateRow[];
  if (rows.length === 0) {
    const { error: deleteError } = await supabase
      .from("patient_provider_relationships")
      .delete()
      .eq("patient_id", patientId)
      .eq("provider_id", providerId);

    if (deleteError) {
      if (isMissingRelationshipsTableError(deleteError)) return null;
      throw deleteError;
    }
    return null;
  }

  const now = new Date();
  const status = deriveRelationshipStatus(rows, now);
  const firstAppointmentAt = rows[0]?.start_time ?? null;
  const lastAppointmentAt = rows.reduce<string | null>((latest, row) => {
    if (!latest) return row.end_time;
    return new Date(row.end_time) > new Date(latest) ? row.end_time : latest;
  }, null);

  const { data, error } = await supabase
    .from("patient_provider_relationships")
    .upsert(
      {
        patient_id: patientId,
        provider_id: providerId,
        status,
        first_appointment_at: firstAppointmentAt,
        last_appointment_at: lastAppointmentAt,
      },
      { onConflict: "patient_id,provider_id" }
    )
    .select("id,patient_id,provider_id,status,is_primary,is_favorite,first_appointment_at,last_appointment_at,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingRelationshipsTableError(error)) return null;
    throw error;
  }
  return data as PatientProviderRelationshipRecord;
}

export async function getPatientProviders(supabase: SupabaseClient, patientId: string, limit = 6) {
  const { data, error } = await supabase
    .from("patient_provider_relationships")
    .select(RELATIONSHIP_SELECT)
    .eq("patient_id", patientId)
    .order("is_primary", { ascending: false })
    .order("is_favorite", { ascending: false })
    .order("last_appointment_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationshipsTableError(error)) return [];
    throw error;
  }
  return ((data ?? []) as RelationshipRow[]).map(normalizeRelationshipRow);
}

export async function getProviderPatients(supabase: SupabaseClient, providerId: string, limit = 8) {
  const { data, error } = await supabase
    .from("patient_provider_relationships")
    .select(RELATIONSHIP_SELECT)
    .eq("provider_id", providerId)
    .order("status", { ascending: true })
    .order("last_appointment_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationshipsTableError(error)) return [];
    throw error;
  }
  return ((data ?? []) as RelationshipRow[]).map(normalizeRelationshipRow);
}

export async function markProviderFavorite(
  supabase: SupabaseClient,
  patientId: string,
  providerId: string,
  isFavorite: boolean
) {
  const { data, error } = await supabase
    .from("patient_provider_relationships")
    .update({ is_favorite: isFavorite })
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .select("id,patient_id,provider_id,status,is_primary,is_favorite,first_appointment_at,last_appointment_at,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingRelationshipsTableError(error)) return null;
    throw error;
  }
  return data as PatientProviderRelationshipRecord;
}

export async function setPrimaryProvider(
  supabase: SupabaseClient,
  patientId: string,
  providerId: string
) {
  const { error: resetError } = await supabase
    .from("patient_provider_relationships")
    .update({ is_primary: false })
    .eq("patient_id", patientId)
    .eq("is_primary", true);

  if (resetError) {
    if (isMissingRelationshipsTableError(resetError)) return null;
    throw resetError;
  }

  const { data, error } = await supabase
    .from("patient_provider_relationships")
    .update({ is_primary: true })
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .select("id,patient_id,provider_id,status,is_primary,is_favorite,first_appointment_at,last_appointment_at,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingRelationshipsTableError(error)) return null;
    throw error;
  }
  return data as PatientProviderRelationshipRecord;
}

function deriveRelationshipStatus(rows: AppointmentAggregateRow[], now: Date) {
  const hasUpcoming = rows.some(
    (row) => ["requested", "confirmed"].includes(row.status) && new Date(row.end_time) >= now
  );
  const hasHistory = rows.some(
    (row) =>
      ["confirmed", "completed", "no_show"].includes(row.status) &&
      new Date(row.start_time) < now
  );

  if (hasUpcoming && hasHistory) return "active";
  if (hasUpcoming) return "booked";
  return "past";
}

function normalizeRelationshipRow(row: RelationshipRow): PatientProviderRelationshipRecord {
  const provider = Array.isArray(row.providers) ? row.providers[0] ?? null : row.providers ?? null;
  const patient = Array.isArray(row.patients) ? row.patients[0] ?? null : row.patients ?? null;

  return {
    id: row.id,
    patient_id: row.patient_id,
    provider_id: row.provider_id,
    status: row.status,
    is_primary: row.is_primary,
    is_favorite: row.is_favorite,
    first_appointment_at: row.first_appointment_at,
    last_appointment_at: row.last_appointment_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    provider: provider ? normalizeProvider(provider) : null,
    patient: patient
      ? {
          id: patient.id,
          user_id: patient.user_id,
          legal_name: patient.legal_name,
          email: patient.email,
        }
      : null,
  };
}

function normalizeProvider(
  provider: Exclude<NonNullable<RelationshipRow["providers"]>, unknown[]>
): ProviderDirectoryRecord {
  const organization = Array.isArray(provider.organizations) ? provider.organizations[0] ?? null : provider.organizations ?? null;
  const specialties = normalizeJoinedNames(provider.provider_specialties, "specialties");
  const conditionFocus = normalizeJoinedNames(provider.provider_condition_focus, "conditions");
  const displayName = normalizeOptionalText(provider.display_name) ?? "CareBridge Provider";
  const slug = normalizeOptionalText(provider.slug) ?? slugifyProviderName(displayName);

  return {
    id: provider.id,
    user_id: provider.user_id ?? undefined,
    organization_id: provider.organization_id,
    slug,
    display_name: displayName,
    credentials: normalizeOptionalText(provider.credentials),
    specialty: normalizeOptionalText(provider.specialty) ?? specialties[0] ?? null,
    specialties,
    condition_focus: conditionFocus,
    bio: normalizeOptionalText(provider.bio),
    states_served: normalizeStringArray(provider.states_served),
    license_states: normalizeStringArray(provider.license_states),
    telehealth_enabled: provider.telehealth_enabled ?? false,
    areas_of_care: Array.from(new Set([...normalizeStringArray(provider.areas_of_care), ...specialties, ...conditionFocus])),
    visit_types: normalizeStringArray(provider.visit_types),
    verification_status: provider.verification_status ?? "draft",
    verification_submitted_at: provider.verification_submitted_at,
    verified_at: provider.verified_at,
    verified_by_user_id: provider.verified_by_user_id,
    rejection_reason: normalizeOptionalText(provider.rejection_reason),
    license_number: normalizeOptionalText(provider.license_number),
    npi_number: normalizeOptionalText(provider.npi_number),
    onboarding_completed: provider.onboarding_completed ?? false,
    is_accepting_patients: provider.is_accepting_patients ?? false,
    organization: organization
      ? {
          name: normalizeOptionalText(organization.name),
          slug: normalizeOptionalText(organization.slug),
        }
      : null,
  };
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

function slugifyProviderName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isMissingRelationshipsTableError(error: { code?: string | null; message?: string | null }) {
  return error.code === "PGRST205" && (error.message ?? "").includes("public.patient_provider_relationships");
}
