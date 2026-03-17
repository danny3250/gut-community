import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createAppointment } from "@/lib/carebridge/appointments";
import { getRequiredFormTypesForAppointment } from "@/lib/carebridge/forms";
import { buildAppointmentReminderSchedule, createNotifications, type NotificationInput } from "@/lib/carebridge/notifications";
import { getOrCreatePatientRecord } from "@/lib/carebridge/patients";
import { getAvailableSlots } from "@/lib/carebridge/scheduling";
import { canProviderAcceptBookings, fetchProviderById, isProviderVerified } from "@/lib/carebridge/providers";
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

  if (!isProviderVerified(provider)) {
    return NextResponse.json({ error: "This provider is not currently available for booking." }, { status: 403 });
  }

  if (!canProviderAcceptBookings(provider)) {
    return NextResponse.json({ error: "This provider is not accepting new patients right now." }, { status: 403 });
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

  const formattedStart = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: payload.timezone,
  }).format(new Date(payload.startIso));
  const requiredFormTypes = getRequiredFormTypesForAppointment(payload.appointmentType);
  const reminderNotifications = buildAppointmentReminderSchedule(payload.startIso);

  const admin = createAdminClient();
  const notifications: NotificationInput[] = [
    {
      userId: user.id,
      type: "appointment_booked",
      title: "Appointment booked",
      body: `Your appointment with ${provider.display_name} is confirmed for ${formattedStart}.`,
      linkUrl: `/portal/appointments/${appointment.id}/confirmed`,
      metadata: {
        appointment_id: appointment.id,
        provider_id: provider.id,
      },
    },
    ...(provider.user_id
      ? [{
          userId: provider.user_id,
          type: "appointment_booked" as const,
          title: "New appointment booked",
          body: `A patient booked a ${payload.appointmentType.replace(/_/g, " ")} visit for ${formattedStart}.`,
          linkUrl: `/provider/appointments/${appointment.id}`,
          metadata: {
            appointment_id: appointment.id,
            patient_id: patientId,
          },
        }]
      : []),
    {
      userId: user.id,
      type: "forms_required",
      title: "Pre-visit forms are ready",
      body: `Please complete ${requiredFormTypes.length} pre-visit form${requiredFormTypes.length === 1 ? "" : "s"} before your appointment.`,
      linkUrl: `/portal/appointments/${appointment.id}`,
      metadata: {
        appointment_id: appointment.id,
        required_form_types: requiredFormTypes,
      },
    },
    ...reminderNotifications.map((reminder) => ({
      userId: user.id,
      type: reminder.type,
      title: reminder.type === "telehealth_ready" ? "Your telehealth visit starts soon" : "Appointment reminder",
      body:
        reminder.type === "telehealth_ready"
          ? `Your telehealth visit with ${provider.display_name} begins in about ${reminder.label}.`
          : `Your appointment with ${provider.display_name} begins in about ${reminder.label}.`,
      linkUrl: `/portal/appointments/${appointment.id}`,
      scheduledFor: reminder.scheduledFor,
      metadata: {
        appointment_id: appointment.id,
        provider_id: provider.id,
      },
    }) satisfies NotificationInput),
    ...reminderNotifications.flatMap((reminder) =>
      provider.user_id
        ? [{
            userId: provider.user_id,
            type: reminder.type === "telehealth_ready" ? "telehealth_ready" : "appointment_reminder",
            title: reminder.type === "telehealth_ready" ? "Telehealth visit starts soon" : "Upcoming appointment reminder",
            body:
              reminder.type === "telehealth_ready"
                ? `Your telehealth visit begins in about ${reminder.label}.`
                : `Your appointment begins in about ${reminder.label}.`,
            linkUrl: `/provider/appointments/${appointment.id}`,
            scheduledFor: reminder.scheduledFor,
            metadata: {
              appointment_id: appointment.id,
              patient_id: patientId,
            },
          } satisfies NotificationInput]
        : []
    ),
  ];
  await createNotifications(admin, notifications);

  return NextResponse.json({ appointment, appointmentId: appointment.id });
}
