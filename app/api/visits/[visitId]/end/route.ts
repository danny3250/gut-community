import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchVisitWithContext } from "@/lib/carebridge/visits";
import { Role } from "@/lib/auth/roles";
import { TelehealthVisitService } from "@/services/telehealth/service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { visitId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before ending a visit." }, { status: 401 });
  }

  const visit = await fetchVisitWithContext(supabase, visitId);
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
  const isAssignedProvider = provider?.user_id === user.id;

  if (!isAdmin && !isAssignedProvider) {
    return NextResponse.json({ error: "Only the assigned provider or admin can end this visit." }, { status: 403 });
  }

  const service = new TelehealthVisitService(supabase);
  const updatedVisit = await service.endVisit(visitId);
  return NextResponse.json({ status: updatedVisit.status });
}
