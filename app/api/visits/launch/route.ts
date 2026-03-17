import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderByUserId, isProviderVerified } from "@/lib/carebridge/providers";
import { TelehealthVisitService } from "@/services/telehealth/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before launching a visit." }, { status: 401 });
  }

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) {
    return NextResponse.json({ error: "Only providers can launch visits." }, { status: 403 });
  }

  if (!isProviderVerified(provider)) {
    return NextResponse.json({ error: "Visit launch is unavailable until provider verification is complete." }, { status: 403 });
  }

  const { appointmentId } = (await request.json()) as { appointmentId?: string };
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment id." }, { status: 400 });
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id,provider_id,appointment_type")
    .eq("id", appointmentId)
    .maybeSingle<{ id: string; provider_id: string; appointment_type: string }>();

  if (!appointment || appointment.provider_id !== provider.id) {
    return NextResponse.json({ error: "You do not have access to this appointment." }, { status: 403 });
  }

  if (appointment.appointment_type !== "telehealth") {
    return NextResponse.json({ error: "Only telehealth appointments can be launched here." }, { status: 400 });
  }

  const service = new TelehealthVisitService(supabase);
  const visit = await service.ensureVisitForAppointment(appointmentId);
  await service.enterVisit(visit.id, "provider");

  return NextResponse.json({ visitId: visit.id });
}
