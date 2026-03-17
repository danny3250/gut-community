import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveDailyCheckin, toDateKey } from "@/lib/carebridge/health";

type Payload = {
  overallFeeling?: number;
  notes?: string | null;
  symptoms?: Array<{ symptomId: string; severity: number }>;
  foods?: Array<{ foodId: string; quantity?: string | null; notes?: string | null }>;
  sleepHours?: number | null;
  stressLevel?: number | null;
  waterIntake?: string | null;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before saving a check-in." }, { status: 401 });
  }

  const payload = (await request.json()) as Payload;
  if (!payload.overallFeeling || payload.overallFeeling < 1 || payload.overallFeeling > 5) {
    return NextResponse.json({ error: "Overall feeling must be between 1 and 5." }, { status: 400 });
  }

  const checkinId = await saveDailyCheckin(supabase, user.id, {
    checkinDate: toDateKey(new Date()),
    overallFeeling: payload.overallFeeling,
    notes: payload.notes ?? null,
    symptoms: payload.symptoms ?? [],
    foods: payload.foods ?? [],
    sleepHours: payload.sleepHours ?? null,
    stressLevel: payload.stressLevel ?? null,
    waterIntake: payload.waterIntake ?? null,
  });

  return NextResponse.json({ ok: true, checkinId });
}
