import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchVisitWithContext } from "@/lib/carebridge/visits";
import { Role } from "@/lib/auth/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { visitId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to view this visit." }, { status: 401 });
  }

  const visit = await fetchVisitWithContext(supabase, visitId);
  const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;
  const provider = Array.isArray(visit.providers) ? visit.providers[0] : visit.providers;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role === "organization_owner" ||
    profile?.role === "support_staff";
  const isPatient = patient?.user_id === user.id;
  const isProvider = provider?.user_id === user.id;

  if (!isAdmin && !isPatient && !isProvider) {
    return NextResponse.json({ error: "You do not have access to this visit." }, { status: 403 });
  }

  return NextResponse.json({
    status: visit.status,
    patientJoinedAt: visit.patient_joined_at,
    providerJoinedAt: visit.provider_joined_at,
    startedAt: visit.started_at,
    endedAt: visit.ended_at,
  });
}
