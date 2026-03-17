export type ProviderDirectoryRecord = {
  id: string;
  organization_id: string | null;
  slug: string;
  user_id?: string;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
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
