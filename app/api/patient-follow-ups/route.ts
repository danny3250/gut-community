import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/carebridge/notifications";
import { upsertPatientFollowUpSummary } from "@/lib/carebridge/follow-ups";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before saving a patient follow-up." }, { status: 401 });
  }

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) {
    return NextResponse.json({ error: "Only providers can manage patient follow-ups." }, { status: 403 });
  }

  const body = (await request.json()) as {
    appointmentId?: string;
    visitId?: string | null;
    patientId?: string;
    followUpTitle?: string | null;
    followUpSummary?: string;
    followUpInstructions?: string | null;
    whatToTrack?: string | null;
    recommendedNextStep?: string | null;
    status?: "draft" | "published";
  };

  if (!body.appointmentId || !body.patientId) {
    return NextResponse.json({ error: "Missing appointment context." }, { status: 400 });
  }

  const followUpSummary = body.followUpSummary?.trim() ?? "";
  if (!followUpSummary) {
    return NextResponse.json({ error: "Add a patient-facing summary before saving." }, { status: 400 });
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id,provider_id,patient_id,patients(user_id)")
    .eq("id", body.appointmentId)
    .maybeSingle<{
      id: string;
      provider_id: string;
      patient_id: string;
      patients:
        | { user_id: string | null }
        | { user_id: string | null }[]
        | null;
    }>();

  if (appointmentError) {
    return NextResponse.json({ error: appointmentError.message }, { status: 400 });
  }

  if (!appointment || appointment.provider_id !== provider.id || appointment.patient_id !== body.patientId) {
    return NextResponse.json({ error: "You do not have access to create a follow-up for this appointment." }, { status: 403 });
  }

  if (body.visitId) {
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id,appointment_id,provider_id,patient_id")
      .eq("id", body.visitId)
      .maybeSingle<{ id: string; appointment_id: string; provider_id: string; patient_id: string }>();

    if (visitError) {
      return NextResponse.json({ error: visitError.message }, { status: 400 });
    }

    if (!visit || visit.appointment_id !== appointment.id || visit.provider_id !== provider.id || visit.patient_id !== body.patientId) {
      return NextResponse.json({ error: "Visit follow-up context is invalid." }, { status: 403 });
    }
  }

  const result = await upsertPatientFollowUpSummary(supabase, {
    appointmentId: appointment.id,
    visitId: body.visitId ?? null,
    patientId: body.patientId,
    providerId: provider.id,
    followUpTitle: body.followUpTitle ?? null,
    followUpSummary,
    followUpInstructions: body.followUpInstructions ?? null,
    whatToTrack: body.whatToTrack ?? null,
    recommendedNextStep: body.recommendedNextStep ?? null,
    status: body.status === "published" ? "published" : "draft",
    editorUserId: user.id,
  });

  const action = result.created
    ? "patient_follow_up_created"
    : result.followUp.status === "published" && result.previousStatus !== "published"
      ? "patient_follow_up_published"
      : "patient_follow_up_updated";

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "provider",
    action,
    entity_type: "patient_follow_up_summary",
    entity_id: result.followUp.id,
    metadata_json: {
      appointment_id: appointment.id,
      visit_id: body.visitId ?? null,
      patient_id: body.patientId,
      status: result.followUp.status,
    },
  });

  if (result.followUp.status === "published" && result.previousStatus !== "published") {
    const patientRecord = Array.isArray(appointment.patients) ? appointment.patients[0] ?? null : appointment.patients ?? null;
    if (patientRecord?.user_id) {
      const admin = createAdminClient();
      await createNotification(admin, {
        userId: patientRecord.user_id,
        type: "care_summary_available",
        title: "Your visit follow-up is ready",
        body: "Your provider shared a follow-up summary with next steps and what to track.",
        linkUrl: `/portal/appointments/${appointment.id}`,
        metadata: {
          appointment_id: appointment.id,
          patient_follow_up_summary_id: result.followUp.id,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, followUp: result.followUp });
}
