import { AppointmentRecord } from "@/lib/carebridge/types";

export const VISIT_STATUSES = [
  "scheduled",
  "waiting_room",
  "provider_joined",
  "in_progress",
  "completed",
  "cancelled",
  "failed",
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];
export type VisitParticipantRole = "patient" | "provider";

export type VisitRecord = {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  status: VisitStatus;
  visit_vendor: string;
  vendor_session_id: string | null;
  patient_join_token: string | null;
  provider_join_token: string | null;
  join_url_patient: string | null;
  join_url_provider: string | null;
  patient_joined_at: string | null;
  provider_joined_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateVisitSessionInput = {
  visitId: string;
  appointment: AppointmentRecord;
};

export type CreatedVisitSession = {
  vendor: string;
  vendorSessionId: string;
  patientJoinToken: string;
  providerJoinToken: string;
  joinUrlPatient: string;
  joinUrlProvider: string;
};

export type VisitJoinInfo = {
  visitId: string;
  participantRole: VisitParticipantRole;
  joinUrl: string | null;
  vendor: string;
  status: VisitStatus;
};

export interface TelehealthProvider {
  createVisitSession(input: CreateVisitSessionInput): Promise<CreatedVisitSession>;
  getPatientJoinInfo(visit: VisitRecord): Promise<VisitJoinInfo>;
  getProviderJoinInfo(visit: VisitRecord): Promise<VisitJoinInfo>;
  endVisitSession(visit: VisitRecord): Promise<void>;
  cancelVisitSession(visit: VisitRecord): Promise<void>;
}
