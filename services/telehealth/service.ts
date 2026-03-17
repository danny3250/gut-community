import type { SupabaseClient } from "@supabase/supabase-js";
import { getTelehealthProvider } from "@/services/telehealth";
import { VisitParticipantRole, VisitRecord, VisitStatus } from "@/services/telehealth/types";

type AppointmentForVisit = {
  id: string;
  patient_id: string;
  provider_id: string;
  organization_id: string | null;
  status: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  timezone: string;
  visit_vendor: string | null;
  visit_external_id: string | null;
  join_url_placeholder: string | null;
};

export class TelehealthVisitService {
  constructor(private readonly supabase: SupabaseClient) {}

  async ensureVisitForAppointment(appointmentId: string) {
    const existing = await this.fetchVisitByAppointmentId(appointmentId);
    if (existing) return existing;

    const appointment = await this.fetchAppointment(appointmentId);

    const { data: inserted, error: insertError } = await this.supabase
      .from("visits")
      .insert({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        provider_id: appointment.provider_id,
        status: "scheduled",
        visit_vendor: "mock",
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw insertError ?? new Error("Could not create visit record.");
    }

    const adapter = getTelehealthProvider();
    const createdSession = await adapter.createVisitSession({
      visitId: inserted.id,
      appointment,
    });

    const { data: hydrated, error: updateError } = await this.supabase
      .from("visits")
      .update({
        visit_vendor: createdSession.vendor,
        vendor_session_id: createdSession.vendorSessionId,
        patient_join_token: createdSession.patientJoinToken,
        provider_join_token: createdSession.providerJoinToken,
        join_url_patient: createdSession.joinUrlPatient,
        join_url_provider: createdSession.joinUrlProvider,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inserted.id)
      .select("*")
      .single();

    if (updateError || !hydrated) {
      throw updateError ?? new Error("Could not hydrate visit session.");
    }

    await this.supabase
      .from("appointments")
      .update({
        visit_vendor: createdSession.vendor,
        visit_external_id: createdSession.vendorSessionId,
        join_url_placeholder: createdSession.joinUrlPatient,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);

    return hydrated as VisitRecord;
  }

  async enterVisit(visitId: string, participantRole: VisitParticipantRole) {
    const visit = await this.fetchVisitById(visitId);
    const nowIso = new Date().toISOString();

    const patch: Partial<VisitRecord> & { updated_at: string } = {
      updated_at: nowIso,
    };

    if (participantRole === "patient") {
      patch.patient_joined_at = nowIso;
      patch.status = visit.provider_joined_at ? "in_progress" : "waiting_room";
      if (visit.provider_joined_at && !visit.started_at) {
        patch.started_at = nowIso;
      }
    } else {
      patch.provider_joined_at = nowIso;
      patch.status = visit.patient_joined_at ? "in_progress" : "provider_joined";
      if (!visit.started_at) {
        patch.started_at = nowIso;
      }
    }

    const { data, error } = await this.supabase
      .from("visits")
      .update(patch)
      .eq("id", visitId)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not update visit status.");
    }

    // TODO: add audit logging for visit entry, waiting room transitions, and role-specific access.
    return data as VisitRecord;
  }

  async endVisit(visitId: string) {
    const visit = await this.fetchVisitById(visitId);
    const adapter = getTelehealthProvider();
    await adapter.endVisitSession(visit);

    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("visits")
      .update({
        status: "completed",
        ended_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", visitId)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not complete visit.");
    }

    await this.supabase
      .from("appointments")
      .update({
        status: "completed",
        updated_at: nowIso,
      })
      .eq("id", visit.appointment_id);

    // TODO: add audit logging and post-visit summary hooks here.
    return data as VisitRecord;
  }

  async cancelVisit(visitId: string) {
    const visit = await this.fetchVisitById(visitId);
    const adapter = getTelehealthProvider();
    await adapter.cancelVisitSession(visit);

    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("visits")
      .update({
        status: "cancelled",
        ended_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", visitId)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not cancel visit.");
    }

    await this.supabase
      .from("appointments")
      .update({
        status: "cancelled",
        updated_at: nowIso,
      })
      .eq("id", visit.appointment_id);

    return data as VisitRecord;
  }

  async fetchVisitById(visitId: string) {
    const { data, error } = await this.supabase.from("visits").select("*").eq("id", visitId).single();
    if (error || !data) {
      throw error ?? new Error("Visit not found.");
    }
    return data as VisitRecord;
  }

  async fetchVisitByAppointmentId(appointmentId: string) {
    const { data, error } = await this.supabase
      .from("visits")
      .select("*")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (error) throw error;
    return data as VisitRecord | null;
  }

  private async fetchAppointment(appointmentId: string) {
    const { data, error } = await this.supabase
      .from("appointments")
      .select(
        "id,patient_id,provider_id,organization_id,status,appointment_type,start_time,end_time,timezone,visit_vendor,visit_external_id,join_url_placeholder"
      )
      .eq("id", appointmentId)
      .single();

    if (error || !data) {
      throw error ?? new Error("Appointment not found.");
    }

    return data as AppointmentForVisit;
  }
}

export function getVisitStatusLabel(status: VisitStatus) {
  return status.replace(/_/g, " ");
}
