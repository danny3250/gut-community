import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProviderVisitNote } from "@/lib/carebridge/provider-notes";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before saving visit notes." }, { status: 401 });
  }

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) {
    return NextResponse.json({ error: "Only providers can save visit notes." }, { status: 403 });
  }

  const body = (await request.json()) as {
    appointmentId?: string;
    visitId?: string | null;
    patientId?: string;
    subject?: string | null;
    noteBody?: string;
    structuredNotes?: Record<string, unknown>;
    status?: "draft" | "finalized";
  };

  if (!body.appointmentId || !body.patientId) {
    return NextResponse.json({ error: "Missing appointment context." }, { status: 400 });
  }

  const noteBody = body.noteBody?.trim() ?? "";
  if (!noteBody) {
    return NextResponse.json({ error: "Add note content before saving." }, { status: 400 });
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id,provider_id,patient_id")
    .eq("id", body.appointmentId)
    .maybeSingle<{ id: string; provider_id: string; patient_id: string }>();

  if (appointmentError) {
    return NextResponse.json({ error: appointmentError.message }, { status: 400 });
  }

  if (!appointment || appointment.provider_id !== provider.id || appointment.patient_id !== body.patientId) {
    return NextResponse.json({ error: "You do not have access to save notes for this appointment." }, { status: 403 });
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
      return NextResponse.json({ error: "Visit note context is invalid." }, { status: 403 });
    }
  }

  const result = await upsertProviderVisitNote(supabase, {
    appointmentId: appointment.id,
    visitId: body.visitId ?? null,
    patientId: body.patientId,
    providerId: provider.id,
    subject: body.subject ?? null,
    noteBody,
    structuredNotes: body.structuredNotes ?? {},
    status: body.status === "finalized" ? "finalized" : "draft",
    editorUserId: user.id,
  });

  const action = result.created
    ? "provider_note_created"
    : result.note.status === "finalized" && result.previousStatus !== "finalized"
      ? "provider_note_finalized"
      : "provider_note_updated";

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "provider",
    action,
    entity_type: "provider_visit_note",
    entity_id: result.note.id,
    metadata_json: {
      appointment_id: appointment.id,
      visit_id: body.visitId ?? null,
      patient_id: body.patientId,
      status: result.note.status,
    },
  });

  return NextResponse.json({ ok: true, note: result.note });
}
