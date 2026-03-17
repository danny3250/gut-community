import {
  CreateVisitSessionInput,
  CreatedVisitSession,
  TelehealthProvider,
  VisitJoinInfo,
  VisitRecord,
} from "@/services/telehealth/types";

export class AmazonChimeAdapter implements TelehealthProvider {
  async createVisitSession(input: CreateVisitSessionInput): Promise<CreatedVisitSession> {
    void input;
    // TODO: wire AWS credentials, region, and BAA-reviewed infrastructure before production use.
    // TODO: call Chime SDK createMeeting and createAttendee for patient/provider.
    throw new Error("Amazon Chime adapter is scaffolded but not configured.");
  }

  async getPatientJoinInfo(visit: VisitRecord): Promise<VisitJoinInfo> {
    void visit;
    // TODO: return patient-specific attendee join info once Chime meeting creation is active.
    throw new Error("Amazon Chime adapter is scaffolded but not configured.");
  }

  async getProviderJoinInfo(visit: VisitRecord): Promise<VisitJoinInfo> {
    void visit;
    // TODO: return provider-specific attendee join info once Chime meeting creation is active.
    throw new Error("Amazon Chime adapter is scaffolded but not configured.");
  }

  async endVisitSession(visit: VisitRecord): Promise<void> {
    void visit;
    // TODO: call deleteMeeting or equivalent Chime cleanup flow.
    throw new Error("Amazon Chime adapter is scaffolded but not configured.");
  }

  async cancelVisitSession(visit: VisitRecord): Promise<void> {
    void visit;
    // TODO: cancel Chime meeting orchestration and clean up attendees.
    throw new Error("Amazon Chime adapter is scaffolded but not configured.");
  }
}
