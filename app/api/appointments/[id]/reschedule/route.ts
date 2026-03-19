import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotifications, type NotificationInput } from "@/lib/carebridge/notifications";
import { syncPatientProviderRelationship } from "@/lib/carebridge/relationships";
import { fetchProviderById, fetchProviderByUserId } from "@/lib/carebridge/providers";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import {
  fetchPatientAppointmentById,
  fetchProviderAppointmentById,
  updateAppointmentForPatient,
  updateAppointmentForProvider,
} from "@/lib/carebridge/appointments";
import { getAvailableSlots } from "@/lib/carebridge/scheduling";
import { Role } from "@/lib/auth/roles";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReschedulePayload = {
  startIso?: string;
  endIso?: string;
  timezone?: string;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const payload = (await request.json()) as ReschedulePayload;
  if (!payload.startIso || !payload.endIso || !payload.timezone) {
    return NextResponse.json({ error: "Missing new appointment time." }, { status: 400 });
  }

  const requestedStart = new Date(payload.startIso);
  if (Number.isNaN(requestedStart.getTime())) {
    return NextResponse.json({ error: "Invalid appointment time." }, { status: 400 });
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

    const slots = await getAvailableSlots(supabase, provider.id, requestedStart);
    const slot = slots.find((item) => item.startIso === payload.startIso && item.endIso === payload.endIso && item.timezone === payload.timezone);
    if (!slot) {
      return NextResponse.json({ error: "That slot is no longer available." }, { status: 409 });
    }

    await updateAppointmentForProvider(supabase, provider.id, id, {
      start_time: payload.startIso,
      end_time: payload.endIso,
      timezone: payload.timezone,
      status: "confirmed",
    });
    const admin = createAdminClient();
    await syncPatientProviderRelationship(admin, appointment.patient_id, provider.id);
    const patientUserId = Array.isArray(appointment.patients) ? appointment.patients[0]?.user_id : appointment.patients?.user_id;
    const notifications: NotificationInput[] = [
      ...(provider.user_id
        ? [{
            userId: provider.user_id,
            type: "appointment_rescheduled" as const,
            title: "Appointment rescheduled",
            body: "The appointment time has been updated.",
            linkUrl: `/provider/appointments/${id}`,
            metadata: { appointment_id: id },
          }]
        : []),
      ...(patientUserId
        ? [{
            userId: patientUserId,
            type: "appointment_rescheduled" as const,
            title: "Appointment rescheduled",
            body: "Your provider updated the appointment time.",
            linkUrl: `/portal/appointments/${id}`,
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

  const provider = await fetchProviderById(supabase, appointment.provider_id);
  if (!provider) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  if (patient.state && !provider.states_served.includes(patient.state)) {
    return NextResponse.json(
      { error: "This provider is not currently licensed to provide telehealth visits in your state." },
      { status: 403 }
    );
  }

  const slots = await getAvailableSlots(supabase, provider.id, requestedStart);
  const slot = slots.find((item) => item.startIso === payload.startIso && item.endIso === payload.endIso && item.timezone === payload.timezone);
  if (!slot) {
    return NextResponse.json({ error: "That slot is no longer available." }, { status: 409 });
  }

  await updateAppointmentForPatient(supabase, patient.id, id, {
    start_time: payload.startIso,
    end_time: payload.endIso,
    timezone: payload.timezone,
    status: "requested",
  });
  const admin = createAdminClient();
  await syncPatientProviderRelationship(admin, patient.id, provider.id);
  const notifications: NotificationInput[] = [
    {
      userId: user.id,
      type: "appointment_rescheduled",
      title: "Reschedule request sent",
      body: "Your new requested time has been saved and shared with the provider.",
      linkUrl: `/portal/appointments/${id}`,
      metadata: { appointment_id: id },
    },
    ...(provider.user_id
      ? [{
          userId: provider.user_id,
          type: "appointment_rescheduled" as const,
          title: "Patient requested a new time",
          body: "A patient requested to reschedule an appointment.",
          linkUrl: `/provider/appointments/${id}`,
          metadata: { appointment_id: id, patient_id: patient.id },
        }]
      : []),
  ];
  await createNotifications(admin, notifications);
  return NextResponse.json({ ok: true });
}
