import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
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
  return NextResponse.json({ ok: true });
}
