export type VisitParticipantRole = "patient" | "provider";

export type CreateVisitSessionInput = {
  appointmentId: string;
  patientId: string;
  providerId: string;
  scheduledStartIso: string;
  scheduledEndIso: string;
};

export type VisitSessionRecord = {
  vendor: string;
  externalSessionId: string;
  joinUrl: string | null;
  status: "scheduled" | "live" | "ended" | "canceled";
};

export type JoinInfo = {
  appointmentId: string;
  participantRole: VisitParticipantRole;
  joinUrl: string | null;
  waitingRoom: boolean;
  vendor: string;
};

export interface TelehealthVisitAdapter {
  createVisitSession(input: CreateVisitSessionInput): Promise<VisitSessionRecord>;
  getPatientJoinInfo(appointmentId: string): Promise<JoinInfo>;
  getProviderJoinInfo(appointmentId: string): Promise<JoinInfo>;
  cancelVisitSession(appointmentId: string): Promise<void>;
  endVisitSession(appointmentId: string): Promise<void>;
}
