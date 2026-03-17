import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAppointment } from "@/lib/carebridge/appointments";
import { getOrCreatePatientRecord } from "@/lib/carebridge/patients";
import { getAvailableSlots } from "@/lib/carebridge/scheduling";
import { fetchProviderById } from "@/lib/carebridge/providers";
import { Role } from "@/lib/auth/roles";

type BookingPayload = {
  providerId: string;
  organizationId: string | null;
  appointmentType: string;
  startIso: string;
  endIso: string;
  timezone: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before booking." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  if (profile?.role === "provider" || profile?.role === "admin" || profile?.role === "organization_owner") {
    return NextResponse.json({ error: "This booking flow is currently patient-only." }, { status: 403 });
  }

  const payload = (await request.json()) as Partial<BookingPayload>;
  if (!payload.providerId || !payload.appointmentType || !payload.startIso || !payload.endIso || !payload.timezone) {
    return NextResponse.json({ error: "Missing appointment details." }, { status: 400 });
  }

  const provider = await fetchProviderById(supabase, payload.providerId);
  if (!provider) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  const patientId = await getOrCreatePatientRecord(supabase, user);
  const { data: patient } = await supabase
    .from("patients")
    .select("id,organization_id,state")
    .eq("id", patientId)
    .maybeSingle<{ id: string; organization_id: string | null; state: string | null }>();

  if (!patient) {
    return NextResponse.json({ error: "Patient record is not available." }, { status: 400 });
  }

  if (patient.organization_id && patient.organization_id !== provider.organization_id) {
    return NextResponse.json(
      { error: "This provider is managed under a different organization." },
      { status: 403 }
    );
  }

  if (patient.state && !provider.states_served.includes(patient.state)) {
    return NextResponse.json(
      { error: "This provider is not currently licensed to provide telehealth visits in your state." },
      { status: 403 }
    );
  }

  const requestedStart = new Date(payload.startIso);
  if (Number.isNaN(requestedStart.getTime())) {
    return NextResponse.json({ error: "Invalid appointment start time." }, { status: 400 });
  }

  const availableSlots = await getAvailableSlots(supabase, payload.providerId, requestedStart);
  const matchingSlot = availableSlots.find(
    (slot) =>
      slot.startIso === payload.startIso &&
      slot.endIso === payload.endIso &&
      slot.timezone === payload.timezone
  );

  if (!matchingSlot) {
    return NextResponse.json({ error: "That time slot is no longer available." }, { status: 409 });
  }

  if (!patient.organization_id && provider.organization_id) {
    const { error: patientUpdateError } = await supabase
      .from("patients")
      .update({ organization_id: provider.organization_id })
      .eq("id", patient.id);

    if (patientUpdateError) {
      return NextResponse.json({ error: patientUpdateError.message }, { status: 400 });
    }
  }

  const appointment = await createAppointment(supabase, {
    patientId,
    providerId: payload.providerId,
    organizationId: provider.organization_id ?? patient.organization_id ?? null,
    appointmentType: payload.appointmentType,
    startIso: payload.startIso,
    endIso: payload.endIso,
    timezone: payload.timezone,
  });

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: profile?.role ?? "patient",
    action: "appointment_requested",
    entity_type: "appointment",
    entity_id: appointment.id,
    metadata_json: {
      provider_id: payload.providerId,
      appointment_type: payload.appointmentType,
      telehealth_vendor_todo: "Amazon Chime SDK integration still needs real session provisioning.",
    },
  });

  return NextResponse.json({ appointment, appointmentId: appointment.id });
}
