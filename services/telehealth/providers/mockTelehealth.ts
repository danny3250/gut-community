import { randomUUID } from "crypto";
import {
  CreateVisitSessionInput,
  CreatedVisitSession,
  TelehealthProvider,
  VisitJoinInfo,
  VisitRecord,
} from "@/services/telehealth/types";

export class MockTelehealthAdapter implements TelehealthProvider {
  async createVisitSession(input: CreateVisitSessionInput): Promise<CreatedVisitSession> {
    const patientJoinToken = randomUUID();
    const providerJoinToken = randomUUID();

    return {
      vendor: "mock",
      vendorSessionId: `mock-session-${input.visitId}`,
      patientJoinToken,
      providerJoinToken,
      joinUrlPatient: `/visit/${input.visitId}?participant=patient&token=${patientJoinToken}`,
      joinUrlProvider: `/visit/${input.visitId}?participant=provider&token=${providerJoinToken}`,
    };
  }

  async getPatientJoinInfo(visit: VisitRecord): Promise<VisitJoinInfo> {
    return {
      visitId: visit.id,
      participantRole: "patient",
      joinUrl: visit.join_url_patient,
      vendor: visit.visit_vendor,
      status: visit.status,
    };
  }

  async getProviderJoinInfo(visit: VisitRecord): Promise<VisitJoinInfo> {
    return {
      visitId: visit.id,
      participantRole: "provider",
      joinUrl: visit.join_url_provider,
      vendor: visit.visit_vendor,
      status: visit.status,
    };
  }

  async endVisitSession(visit: VisitRecord): Promise<void> {
    void visit;
    return;
  }

  async cancelVisitSession(visit: VisitRecord): Promise<void> {
    void visit;
    return;
  }
}
