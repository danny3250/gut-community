import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  return NextResponse.json({ ok: true });
}
