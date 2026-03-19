import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotifications, type NotificationInput } from "@/lib/carebridge/notifications";
import { syncPatientProviderRelationship } from "@/lib/carebridge/relationships";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";
import { fetchProviderAppointmentById, updateAppointmentForProvider } from "@/lib/carebridge/appointments";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StatusPayload = {
  status?: string;
};

const ALLOWED_STATUSES = new Set(["requested", "confirmed", "cancelled", "completed", "no_show"]);

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) {
    return NextResponse.json({ error: "Provider record not found." }, { status: 404 });
  }

  const payload = (await request.json()) as StatusPayload;
  if (!payload.status || !ALLOWED_STATUSES.has(payload.status)) {
    return NextResponse.json({ error: "Invalid appointment status." }, { status: 400 });
  }

  const appointment = await fetchProviderAppointmentById(supabase, provider.id, id);
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  await updateAppointmentForProvider(supabase, provider.id, id, { status: payload.status });
  const admin = createAdminClient();
  await syncPatientProviderRelationship(admin, appointment.patient_id, provider.id);
  const patientUserId = Array.isArray(appointment.patients) ? appointment.patients[0]?.user_id : appointment.patients?.user_id;
  if (patientUserId) {
    const notifications: NotificationInput[] = [
      {
        userId: patientUserId,
        type: payload.status === "cancelled" ? "appointment_cancelled" : "appointment_reminder",
        title:
          payload.status === "confirmed"
            ? "Appointment confirmed"
            : payload.status === "completed"
              ? "Appointment completed"
              : payload.status === "no_show"
                ? "Appointment marked no-show"
                : payload.status === "cancelled"
                  ? "Appointment cancelled"
                  : "Appointment updated",
        body: `Your provider updated the appointment status to ${payload.status.replace(/_/g, " ")}.`,
        linkUrl: `/portal/appointments/${id}`,
        metadata: { appointment_id: id, status: payload.status },
      },
    ];
    await createNotifications(admin, notifications);
  }
  return NextResponse.json({ ok: true });
}
