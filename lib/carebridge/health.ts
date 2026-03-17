import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckinOption = {
  id: string;
  name: string;
  slug: string;
};

export type DailyCheckinRecord = {
  id: string;
  user_id: string;
  checkin_date: string;
  overall_feeling: number;
  notes: string | null;
  created_at: string;
  checkin_symptoms?: Array<{
    severity: number;
    symptoms?: CheckinOption | CheckinOption[] | null;
  }> | null;
  checkin_foods?: Array<{
    quantity: string | null;
    notes: string | null;
    foods?: CheckinOption | CheckinOption[] | null;
  }> | null;
  lifestyle_metrics?: {
    sleep_hours: number | null;
    stress_level: number | null;
    water_intake: string | null;
  } | {
    sleep_hours: number | null;
    stress_level: number | null;
    water_intake: string | null;
  }[] | null;
};

export type DailyCheckinInput = {
  checkinDate: string;
  overallFeeling: number;
  notes?: string | null;
  symptoms: Array<{ symptomId: string; severity: number }>;
  foods: Array<{ foodId: string; quantity?: string | null; notes?: string | null }>;
  sleepHours?: number | null;
  stressLevel?: number | null;
  waterIntake?: string | null;
};

export async function fetchHealthOptions(supabase: SupabaseClient) {
  const [{ data: symptoms, error: symptomsError }, { data: foods, error: foodsError }] = await Promise.all([
    supabase.from("symptoms").select("id,name,slug").order("name", { ascending: true }),
    supabase.from("foods").select("id,name,slug").order("name", { ascending: true }),
  ]);

  if (symptomsError) throw symptomsError;
  if (foodsError) throw foodsError;

  return {
    symptoms: (symptoms ?? []) as CheckinOption[],
    foods: (foods ?? []) as CheckinOption[],
  };
}

export async function fetchTodayCheckinByUserId(supabase: SupabaseClient, userId: string, date = new Date()) {
  return fetchCheckinByDate(supabase, userId, toDateKey(date));
}

export async function fetchCheckinByDate(supabase: SupabaseClient, userId: string, dateKey: string) {
  const { data, error } = await supabase
    .from("daily_checkins")
    .select(`
      id,user_id,checkin_date,overall_feeling,notes,created_at,
      checkin_symptoms(severity,symptoms(id,name,slug)),
      checkin_foods(quantity,notes,foods(id,name,slug)),
      lifestyle_metrics(sleep_hours,stress_level,water_intake)
    `)
    .eq("user_id", userId)
    .eq("checkin_date", dateKey)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DailyCheckinRecord | null;
}

export async function getUserRecentCheckins(
  supabase: SupabaseClient,
  userId: string,
  limit = 14
) {
  const { data, error } = await supabase
    .from("daily_checkins")
    .select(`
      id,user_id,checkin_date,overall_feeling,notes,created_at,
      checkin_symptoms(severity,symptoms(id,name,slug)),
      checkin_foods(quantity,notes,foods(id,name,slug)),
      lifestyle_metrics(sleep_hours,stress_level,water_intake)
    `)
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DailyCheckinRecord[];
}

export async function saveDailyCheckin(
  supabase: SupabaseClient,
  userId: string,
  input: DailyCheckinInput
) {
  const existing = await fetchCheckinByDate(supabase, userId, input.checkinDate);

  let checkinId = existing?.id ?? null;
  if (checkinId) {
    const { error } = await supabase
      .from("daily_checkins")
      .update({
        overall_feeling: input.overallFeeling,
        notes: input.notes ?? null,
      })
      .eq("id", checkinId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("daily_checkins")
      .insert({
        user_id: userId,
        checkin_date: input.checkinDate,
        overall_feeling: input.overallFeeling,
        notes: input.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Could not save check-in.");
    checkinId = data.id as string;
  }

  await Promise.all([
    supabase.from("checkin_symptoms").delete().eq("checkin_id", checkinId),
    supabase.from("checkin_foods").delete().eq("checkin_id", checkinId),
    supabase.from("lifestyle_metrics").delete().eq("checkin_id", checkinId),
  ]);

  if (input.symptoms.length > 0) {
    const { error } = await supabase.from("checkin_symptoms").insert(
      input.symptoms.map((symptom) => ({
        checkin_id: checkinId,
        symptom_id: symptom.symptomId,
        severity: symptom.severity,
      }))
    );
    if (error) throw error;
  }

  if (input.foods.length > 0) {
    const { error } = await supabase.from("checkin_foods").insert(
      input.foods.map((food) => ({
        checkin_id: checkinId,
        food_id: food.foodId,
        quantity: food.quantity ?? null,
        notes: food.notes ?? null,
      }))
    );
    if (error) throw error;
  }

  const { error: lifestyleError } = await supabase.from("lifestyle_metrics").insert({
    checkin_id: checkinId,
    sleep_hours: input.sleepHours ?? null,
    stress_level: input.stressLevel ?? null,
    water_intake: input.waterIntake ?? null,
  });
  if (lifestyleError) throw lifestyleError;

  return checkinId;
}

export function summarizeCheckinTrends(checkins: DailyCheckinRecord[]) {
  const symptomCounts = new Map<string, { name: string; count: number }>();
  const foodCounts = new Map<string, { name: string; count: number }>();
  const sleepValues: number[] = [];
  const stressValues: number[] = [];

  for (const checkin of checkins) {
    for (const symptomRow of checkin.checkin_symptoms ?? []) {
      const symptom = Array.isArray(symptomRow.symptoms) ? symptomRow.symptoms[0] : symptomRow.symptoms;
      if (!symptom) continue;
      const current = symptomCounts.get(symptom.slug) ?? { name: symptom.name, count: 0 };
      current.count += 1;
      symptomCounts.set(symptom.slug, current);
    }

    for (const foodRow of checkin.checkin_foods ?? []) {
      const food = Array.isArray(foodRow.foods) ? foodRow.foods[0] : foodRow.foods;
      if (!food) continue;
      const current = foodCounts.get(food.slug) ?? { name: food.name, count: 0 };
      current.count += 1;
      foodCounts.set(food.slug, current);
    }

    const lifestyle = Array.isArray(checkin.lifestyle_metrics) ? checkin.lifestyle_metrics[0] : checkin.lifestyle_metrics;
    if (typeof lifestyle?.sleep_hours === "number") {
      sleepValues.push(Number(lifestyle.sleep_hours));
    }
    if (typeof lifestyle?.stress_level === "number") {
      stressValues.push(Number(lifestyle.stress_level));
    }
  }

  const averageFeeling = checkins.length
    ? Number((checkins.reduce((sum, checkin) => sum + checkin.overall_feeling, 0) / checkins.length).toFixed(1))
    : null;

  return {
    averageFeeling,
    averageSleepHours: sleepValues.length
      ? Number((sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length).toFixed(1))
      : null,
    averageStressLevel: stressValues.length
      ? Number((stressValues.reduce((sum, value) => sum + value, 0) / stressValues.length).toFixed(1))
      : null,
    symptomFrequency: Array.from(symptomCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5),
    recentFoods: Array.from(foodCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

export async function fetchProviderPatientHealthSummary(
  supabase: SupabaseClient,
  providerId: string
) {
  const { data, error } = await supabase
    .from("appointments")
    .select("patient_id,patients(id,user_id,legal_name,email)")
    .eq("provider_id", providerId)
    .order("start_time", { ascending: false });

  if (error) throw error;

  const seen = new Set<string>();
  const patientRows = (data ?? [])
    .map((row) => (Array.isArray(row.patients) ? row.patients[0] : row.patients))
    .filter((patient): patient is { id: string; user_id: string; legal_name: string | null; email: string | null } => !!patient?.id && !!patient.user_id)
    .filter((patient) => {
      if (seen.has(patient.id)) return false;
      seen.add(patient.id);
      return true;
    });

  const summaries = await Promise.all(
    patientRows.map(async (patient) => {
      const recent = await getUserRecentCheckins(supabase, patient.user_id, 5);
      return {
        patient,
        recentCheckins: recent,
        trends: summarizeCheckinTrends(recent),
      };
    })
  );

  return summaries;
}

export async function fetchProviderPatientHealthDetail(
  supabase: SupabaseClient,
  providerId: string,
  patientId: string
) {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id,user_id,legal_name,email")
    .eq("id", patientId)
    .maybeSingle<{ id: string; user_id: string; legal_name: string | null; email: string | null }>();

  if (patientError) throw patientError;
  if (!patient) return null;

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id")
    .eq("provider_id", providerId)
    .eq("patient_id", patientId)
    .limit(1)
    .maybeSingle();

  if (!appointment) return null;

  const recentCheckins = await getUserRecentCheckins(supabase, patient.user_id, 14);
  return {
    patient,
    recentCheckins,
    trends: summarizeCheckinTrends(recentCheckins),
  };
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getRecipeRelevantSignals(
  supabase: SupabaseClient,
  userId: string
) {
  const recentCheckins = await getUserRecentCheckins(supabase, userId, 14);
  const trends = summarizeCheckinTrends(recentCheckins);

  return {
    recentCheckinCount: recentCheckins.length,
    commonSymptoms: trends.symptomFrequency.map((item) => item.name),
    commonFoods: trends.recentFoods.map((item) => item.name),
    averageFeeling: trends.averageFeeling,
    averageSleepHours: trends.averageSleepHours,
    averageStressLevel: trends.averageStressLevel,
  };
}
