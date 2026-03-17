import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { savePatientIntakeForm } from "@/lib/carebridge/forms";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before submitting a form." }, { status: 401 });
  }

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) {
    return NextResponse.json({ error: "Patient record not found." }, { status: 400 });
  }

  const { appointmentId, formType, responses } = (await request.json()) as {
    appointmentId?: string | null;
    formType?: string;
    responses?: Record<string, unknown>;
  };

  if (!formType || !responses) {
    return NextResponse.json({ error: "Missing form data." }, { status: 400 });
  }

  if (appointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", appointmentId)
      .eq("patient_id", patient.id)
      .maybeSingle();

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 403 });
    }
  }

  const formId = await savePatientIntakeForm(supabase, patient.id, user.id, appointmentId ?? null, formType, responses);

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "patient",
    action: "form_submitted",
    entity_type: "intake_form",
    entity_id: formId,
    metadata_json: { appointment_id: appointmentId ?? null, form_type: formType },
  });

  return NextResponse.json({ ok: true, formId });
}
