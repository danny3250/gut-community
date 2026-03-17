import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { savePatientIntakeForm } from "@/lib/carebridge/forms";
import { createNotifications, type NotificationInput } from "@/lib/carebridge/notifications";
import { fetchProviderById } from "@/lib/carebridge/providers";
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

  let appointmentContext:
    | { id: string; provider_id: string; start_time: string; timezone: string }
    | null = null;

  if (appointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id,provider_id,start_time,timezone")
      .eq("id", appointmentId)
      .eq("patient_id", patient.id)
      .maybeSingle();

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 403 });
    }

    appointmentContext = appointment as { id: string; provider_id: string; start_time: string; timezone: string };
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

  if (appointmentContext) {
    const provider = await fetchProviderById(supabase, appointmentContext.provider_id);
    const appointmentLabel = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: appointmentContext.timezone,
    }).format(new Date(appointmentContext.start_time));
    const notifications: NotificationInput[] = [
      {
        userId: user.id,
        type: "forms_submitted",
        title: "Forms submitted",
        body: `Your intake information for ${appointmentLabel} has been shared with your provider.`,
        linkUrl: `/portal/forms/${formId}`,
        metadata: { appointment_id: appointmentId, form_type: formType },
      },
      ...(provider?.user_id
        ? [{
            userId: provider.user_id,
            type: "forms_submitted" as const,
            title: "Patient forms submitted",
            body: `A patient submitted ${formType.replace(/_/g, " ")} for an upcoming appointment.`,
            linkUrl: `/provider/appointments/${appointmentId}`,
            metadata: { appointment_id: appointmentId, form_type: formType, patient_id: patient.id },
          }]
        : []),
    ];

    const admin = createAdminClient();
    await createNotifications(admin, notifications);
  }

  return NextResponse.json({ ok: true, formId });
}
