import {
  CreateVisitSessionInput,
  JoinInfo,
  TelehealthVisitAdapter,
  VisitSessionRecord,
} from "@/lib/telehealth/types";

export class PlaceholderTelehealthAdapter implements TelehealthVisitAdapter {
  async createVisitSession(input: CreateVisitSessionInput): Promise<VisitSessionRecord> {
    return {
      vendor: "placeholder",
      externalSessionId: `placeholder-${input.appointmentId}`,
      joinUrl: null,
      status: "scheduled",
    };
  }

  async getPatientJoinInfo(appointmentId: string): Promise<JoinInfo> {
    return {
      appointmentId,
      participantRole: "patient",
      joinUrl: null,
      waitingRoom: true,
      vendor: "placeholder",
    };
  }

  async getProviderJoinInfo(appointmentId: string): Promise<JoinInfo> {
    return {
      appointmentId,
      participantRole: "provider",
      joinUrl: null,
      waitingRoom: false,
      vendor: "placeholder",
    };
  }

  async cancelVisitSession(appointmentId: string): Promise<void> {
    void appointmentId;
    return;
  }

  async endVisitSession(appointmentId: string): Promise<void> {
    void appointmentId;
    return;
  }
}
