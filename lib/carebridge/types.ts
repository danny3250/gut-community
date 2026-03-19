export type ProviderDirectoryRecord = {
  id: string;
  organization_id: string | null;
  slug: string;
  user_id?: string;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  specialties: string[];
  condition_focus: string[];
  bio: string | null;
  states_served: string[];
  license_states?: string[];
  telehealth_enabled: boolean;
  areas_of_care: string[] | null;
  visit_types: string[] | null;
  verification_status?: "draft" | "pending" | "verified" | "rejected" | "suspended" | string;
  verification_submitted_at?: string | null;
  verified_at?: string | null;
  verified_by_user_id?: string | null;
  rejection_reason?: string | null;
  license_number?: string | null;
  npi_number?: string | null;
  onboarding_completed?: boolean;
  is_accepting_patients?: boolean;
  organization: { name: string | null; slug?: string | null } | null;
};

export type ProviderApplicationRecord = {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  specialty_slugs: string[];
  condition_focus_slugs: string[];
  bio: string | null;
  states_served: string[];
  license_states: string[];
  telehealth_enabled: boolean;
  organization_id: string | null;
  license_number: string | null;
  npi_number: string | null;
  is_accepting_patients: boolean;
  status: "pending" | "approved" | "rejected" | string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  organization: { name: string | null; slug?: string | null } | null;
  active_provider: ProviderDirectoryRecord | null;
};

export type PatientProviderRelationshipRecord = {
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
  provider?: ProviderDirectoryRecord | null;
  patient?: {
    id: string;
    user_id?: string | null;
    legal_name: string | null;
    email: string | null;
  } | null;
};

export type ProviderAvailabilityRecord = {
  id: string;
  provider_id: string;
  day_of_week: number | null;
  weekday: number | null;
  start_local_time: string;
  end_local_time: string;
  timezone: string;
  slot_duration_minutes: number | null;
};

export type ProviderTimeBlockRecord = {
  id: string;
  provider_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AppointmentRecord = {
  id: string;
  provider_id: string;
  patient_id: string;
  organization_id: string | null;
  status: "requested" | "confirmed" | "cancelled" | "completed" | string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  timezone: string;
  visit_vendor: string | null;
  visit_external_id: string | null;
  join_url_placeholder: string | null;
};

export type ProviderVisitNoteRecord = {
  id: string;
  appointment_id: string;
  visit_id: string | null;
  patient_id: string;
  provider_id: string;
  status: "draft" | "finalized" | string;
  subject: string | null;
  note_body: string;
  structured_notes: Record<string, unknown>;
  created_by_user_id: string | null;
  last_edited_by_user_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
};

export type PatientFollowUpSummaryRecord = {
  id: string;
  appointment_id: string;
  visit_id: string | null;
  patient_id: string;
  provider_id: string;
  follow_up_title: string | null;
  follow_up_summary: string;
  follow_up_instructions: string | null;
  what_to_track: string | null;
  recommended_next_step: string | null;
  status: "draft" | "published" | string;
  published_at: string | null;
  created_by_user_id: string | null;
  last_edited_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};
