import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import { syncPatientProviderRelationship } from "@/lib/carebridge/relationships";
import { createNotifications, type NotificationInput } from "@/lib/carebridge/notifications";
import { fetchPatientAppointmentById, fetchProviderAppointmentById, updateAppointmentForPatient, updateAppointmentForProvider } from "@/lib/carebridge/appointments";
import { Role } from "@/lib/auth/roles";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  if (profile?.role === "provider") {
    const provider = await fetchProviderByUserId(supabase, user.id);
    if (!provider) {
      return NextResponse.json({ error: "Provider record not found." }, { status: 404 });
    }

    const appointment = await fetchProviderAppointmentById(supabase, provider.id, id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    if (new Date(appointment.end_time) < new Date()) {
      return NextResponse.json({ error: "Past appointments cannot be cancelled." }, { status: 400 });
    }

    await updateAppointmentForProvider(supabase, provider.id, id, { status: "cancelled" });
    const admin = createAdminClient();
    await syncPatientProviderRelationship(admin, appointment.patient_id, provider.id);
    const patientUserId = Array.isArray(appointment.patients) ? appointment.patients[0]?.user_id : appointment.patients?.user_id;
    const notifications: NotificationInput[] = [
      ...(patientUserId
        ? [{
            userId: patientUserId,
            type: "appointment_cancelled" as const,
            title: "Appointment cancelled",
            body: "Your provider cancelled the appointment.",
            linkUrl: `/portal/appointments/${id}`,
            metadata: { appointment_id: id },
          }]
        : []),
      ...(provider.user_id
        ? [{
            userId: provider.user_id,
            type: "appointment_cancelled" as const,
            title: "Appointment cancelled",
            body: "The appointment has been cancelled.",
            linkUrl: `/provider/appointments/${id}`,
            metadata: { appointment_id: id },
          }]
        : []),
    ];
    await createNotifications(admin, notifications);
    return NextResponse.json({ ok: true });
  }

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) {
    return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
  }

  const appointment = await fetchPatientAppointmentById(supabase, patient.id, id);
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  if (new Date(appointment.end_time) < new Date()) {
    return NextResponse.json({ error: "Past appointments cannot be cancelled." }, { status: 400 });
  }

  await updateAppointmentForPatient(supabase, patient.id, id, { status: "cancelled" });
  const admin = createAdminClient();
  await syncPatientProviderRelationship(admin, patient.id, appointment.provider_id);
  const providerUserId = Array.isArray(appointment.providers) ? appointment.providers[0]?.user_id : appointment.providers?.user_id;
  const notifications: NotificationInput[] = [
    {
      userId: user.id,
      type: "appointment_cancelled",
      title: "Appointment cancelled",
      body: "Your appointment has been cancelled.",
      linkUrl: `/portal/appointments/${id}`,
      metadata: { appointment_id: id },
    },
    ...(providerUserId
      ? [{
          userId: providerUserId,
          type: "appointment_cancelled" as const,
          title: "Appointment cancelled",
          body: "A patient cancelled an appointment.",
          linkUrl: `/provider/appointments/${id}`,
          metadata: { appointment_id: id, patient_id: patient.id },
        }]
      : []),
  ];
  await createNotifications(admin, notifications);
  return NextResponse.json({ ok: true });
}
