import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppointmentConversation } from "@/lib/carebridge/messages";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before opening messages." }, { status: 401 });
  }

  const { appointmentId } = (await request.json()) as { appointmentId?: string };
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment id." }, { status: 400 });
  }

  try {
    const result = await ensureAppointmentConversation(supabase, user.id, appointmentId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not open conversation." },
      { status: 400 }
    );
  }
}
