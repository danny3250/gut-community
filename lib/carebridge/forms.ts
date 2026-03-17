import type { SupabaseClient } from "@supabase/supabase-js";

export type IntakeField =
  | { id: string; label: string; type: "text" | "textarea" }
  | { id: string; label: string; type: "yes_no" }
  | { id: string; label: string; type: "select"; options: string[] }
  | { id: string; label: string; type: "checkbox_group"; options: string[] };

export type IntakeTemplate = {
  formType: string;
  title: string;
  description: string;
  fields: IntakeField[];
};

export type IntakeFormRecord = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  form_type: string;
  structured_responses: Record<string, unknown>;
  status: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  version?: string | null;
  reviewed_at?: string | null;
  reviewed_by_user_id?: string | null;
};

export type DocumentRecord = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  uploaded_by_user_id: string;
  category: string;
  title: string | null;
  description: string | null;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

export const DOCUMENT_CATEGORIES = [
  "insurance",
  "referral",
  "lab_result",
  "intake_attachment",
  "prior_records",
  "imaging",
  "other",
] as const;

export const INTAKE_TEMPLATES: Record<string, IntakeTemplate> = {
  new_patient_intake: {
    formType: "new_patient_intake",
    title: "New patient intake",
    description: "Share core health history and practical background before your first visit.",
    fields: [
      { id: "main_concern", label: "What is bringing you in right now?", type: "textarea" },
      { id: "symptoms_duration", label: "How long have symptoms been going on?", type: "text" },
      { id: "current_medications", label: "Current medications or supplements", type: "textarea" },
      { id: "allergies", label: "Allergies or sensitivities", type: "textarea" },
    ],
  },
  telehealth_precheck: {
    formType: "telehealth_precheck",
    title: "Telehealth pre-check",
    description: "Confirm the basics before a remote visit starts.",
    fields: [
      { id: "location_confirmed", label: "Will you be in a private location during the visit?", type: "yes_no" },
      { id: "tech_ready", label: "Do you have a stable internet connection and camera access?", type: "yes_no" },
      { id: "call_back_number", label: "Best phone number if the connection drops", type: "text" },
    ],
  },
  appointment_prep: {
    formType: "appointment_prep",
    title: "Appointment preparation",
    description: "Help your provider review priorities before the appointment.",
    fields: [
      { id: "visit_goals", label: "What would you most like to cover in this visit?", type: "textarea" },
      { id: "recent_changes", label: "Any recent changes in symptoms, meds, or routines?", type: "textarea" },
      { id: "questions", label: "Questions you want to make sure get answered", type: "textarea" },
    ],
  },
};

export function getRequiredFormTypesForAppointment(appointmentType: string) {
  const types = ["appointment_prep"];
  if (appointmentType === "telehealth") {
    types.push("telehealth_precheck");
  }
  types.push("new_patient_intake");
  return types;
}

export function getIntakeTemplate(formType: string) {
  return INTAKE_TEMPLATES[formType] ?? null;
}

export async function fetchPatientForms(
  supabase: SupabaseClient,
  patientId: string
) {
  const { data, error } = await supabase
    .from("intake_forms")
    .select("id,patient_id,appointment_id,form_type,structured_responses,status,submitted_at,created_at,updated_at,version,reviewed_at,reviewed_by_user_id")
    .eq("patient_id", patientId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as IntakeFormRecord[];
}

export async function fetchPatientFormById(
  supabase: SupabaseClient,
  patientId: string,
  formId: string
) {
  const { data, error } = await supabase
    .from("intake_forms")
    .select("id,patient_id,appointment_id,form_type,structured_responses,status,submitted_at,created_at,updated_at,version,reviewed_at,reviewed_by_user_id")
    .eq("patient_id", patientId)
    .eq("id", formId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as IntakeFormRecord | null;
}

export async function fetchAppointmentFormsForPatient(
  supabase: SupabaseClient,
  patientId: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("intake_forms")
    .select("id,patient_id,appointment_id,form_type,structured_responses,status,submitted_at,created_at,updated_at,version,reviewed_at,reviewed_by_user_id")
    .eq("patient_id", patientId)
    .eq("appointment_id", appointmentId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as IntakeFormRecord[];
}

export async function fetchAppointmentFormsForProvider(
  supabase: SupabaseClient,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("intake_forms")
    .select("id,patient_id,appointment_id,form_type,structured_responses,status,submitted_at,created_at,updated_at,version,reviewed_at,reviewed_by_user_id")
    .eq("appointment_id", appointmentId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as IntakeFormRecord[];
}

export async function savePatientIntakeForm(
  supabase: SupabaseClient,
  patientId: string,
  userId: string,
  appointmentId: string | null,
  formType: string,
  responses: Record<string, unknown>
) {
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase
    .from("intake_forms")
    .select("id")
    .eq("patient_id", patientId)
    .eq("form_type", formType)
    .eq("appointment_id", appointmentId)
    .maybeSingle<{ id: string }>();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("intake_forms")
      .update({
        structured_responses: responses,
        status: "submitted",
        submitted_at: now,
        completed_by_user_id: userId,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("intake_forms")
    .insert({
      patient_id: patientId,
      appointment_id: appointmentId,
      form_type: formType,
      structured_responses: responses,
      status: "submitted",
      submitted_at: now,
      completed_by_user_id: userId,
      updated_at: now,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) throw error ?? new Error("Could not save form.");
  return data.id;
}

export async function fetchPatientDocuments(
  supabase: SupabaseClient,
  patientId: string
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id,patient_id,appointment_id,uploaded_by_user_id,category,title,description,file_path,mime_type,file_size_bytes,created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRecord[];
}

export async function fetchAppointmentDocumentsForPatient(
  supabase: SupabaseClient,
  patientId: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id,patient_id,appointment_id,uploaded_by_user_id,category,title,description,file_path,mime_type,file_size_bytes,created_at")
    .eq("patient_id", patientId)
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRecord[];
}

export async function fetchAppointmentDocumentsForProvider(
  supabase: SupabaseClient,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id,patient_id,appointment_id,uploaded_by_user_id,category,title,description,file_path,mime_type,file_size_bytes,created_at")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRecord[];
}

export async function fetchPatientDocumentById(
  supabase: SupabaseClient,
  patientId: string,
  documentId: string
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id,patient_id,appointment_id,uploaded_by_user_id,category,title,description,file_path,mime_type,file_size_bytes,created_at")
    .eq("patient_id", patientId)
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DocumentRecord | null;
}

export async function fetchAuthorizedDocumentById(
  supabase: SupabaseClient,
  documentId: string
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id,patient_id,appointment_id,uploaded_by_user_id,category,title,description,file_path,mime_type,file_size_bytes,created_at")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DocumentRecord | null;
}

export function formatFormTypeLabel(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDocumentCategory(value: string) {
  return formatFormTypeLabel(value);
}
