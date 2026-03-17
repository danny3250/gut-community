import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreatePatientRecord } from "@/lib/carebridge/patients";
import { TelehealthVisitService } from "@/services/telehealth/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before joining a visit." }, { status: 401 });
  }

  const { appointmentId } = (await request.json()) as { appointmentId?: string };
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment id." }, { status: 400 });
  }

  const patientId = await getOrCreatePatientRecord(supabase, user);
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id,patient_id,appointment_type")
    .eq("id", appointmentId)
    .maybeSingle<{ id: string; patient_id: string; appointment_type: string }>();

  if (!appointment || appointment.patient_id !== patientId) {
    return NextResponse.json({ error: "You do not have access to this appointment." }, { status: 403 });
  }

  if (appointment.appointment_type !== "telehealth") {
    return NextResponse.json({ error: "Only telehealth appointments can be joined here." }, { status: 400 });
  }

  const service = new TelehealthVisitService(supabase);
  const visit = await service.ensureVisitForAppointment(appointmentId);

  return NextResponse.json({ visitId: visit.id });
}
