"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckinOption, DailyCheckinRecord } from "@/lib/carebridge/checkins";

type CheckInFormProps = {
  symptomOptions: CheckinOption[];
  foodOptions: CheckinOption[];
  initialCheckin?: DailyCheckinRecord | null;
};

export default function CheckInForm({
  symptomOptions,
  foodOptions,
  initialCheckin = null,
}: CheckInFormProps) {
  const router = useRouter();
  const initialLifestyle = Array.isArray(initialCheckin?.lifestyle_metrics)
    ? initialCheckin?.lifestyle_metrics[0] ?? null
    : initialCheckin?.lifestyle_metrics ?? null;

  const [overallFeeling, setOverallFeeling] = useState(initialCheckin?.overall_feeling ?? 3);
  const [sleepHours, setSleepHours] = useState(
    typeof initialLifestyle?.sleep_hours === "number" ? String(initialLifestyle.sleep_hours) : "8"
  );
  const [stressLevel, setStressLevel] = useState(initialLifestyle?.stress_level ?? 3);
  const [notes, setNotes] = useState(initialCheckin?.notes ?? "");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, number>>(
    Object.fromEntries(
      (initialCheckin?.checkin_symptoms ?? [])
        .map((row) => {
          const symptom = Array.isArray(row.symptoms) ? row.symptoms[0] : row.symptoms;
          return symptom ? [symptom.id, row.severity] : null;
        })
        .filter((item): item is [string, number] => !!item)
    )
  );
  const [selectedFoods, setSelectedFoods] = useState<Record<string, { quantity: string; notes: string }>>(
    Object.fromEntries(
      (initialCheckin?.checkin_foods ?? [])
        .map((row) => {
          const food = Array.isArray(row.foods) ? row.foods[0] : row.foods;
          return food ? [food.id, { quantity: row.quantity ?? "", notes: row.notes ?? "" }] : null;
        })
        .filter((item): item is [string, { quantity: string; notes: string }] => !!item)
    )
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleSymptom(symptomId: string) {
    setSelectedSymptoms((current) => {
      const next = { ...current };
      if (next[symptomId]) {
        delete next[symptomId];
      } else {
        next[symptomId] = 3;
      }
      return next;
    });
  }

  function toggleFood(foodId: string) {
    setSelectedFoods((current) => {
      const next = { ...current };
      if (next[foodId]) {
        delete next[foodId];
      } else {
        next[foodId] = { quantity: "", notes: "" };
      }
      return next;
    });
  }

  async function onSubmit() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/health/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overallFeeling,
        notes,
        symptoms: Object.entries(selectedSymptoms).map(([symptomId, severity]) => ({ symptomId, severity })),
        foods: Object.entries(selectedFoods).map(([foodId, value]) => ({
          foodId,
          quantity: value.quantity || null,
          notes: value.notes || null,
        })),
        sleepHours: sleepHours ? Number(sleepHours) : null,
        stressLevel,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not save today's check-in.");
      return;
    }

    router.push("/portal/health?saved=1");
    router.refresh();
  }

  return (
    <section className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Daily check-in</span>
      <h1 className="mt-4 text-3xl font-semibold">
        {initialCheckin ? "Update today's check-in." : "Take a quick pulse on today."}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        Keep it simple: log how you felt, what stood out, and a few context clues that can support future care and recipe guidance.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <div className="text-sm font-medium">1. How do you feel today?</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setOverallFeeling(value)}
                className={overallFeeling === value ? "btn-primary px-4 py-2 text-sm" : "btn-secondary px-4 py-2 text-sm"}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">2. Any symptoms?</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {symptomOptions.map((symptom) => {
              const selected = symptom.id in selectedSymptoms;
              return (
                <div key={symptom.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 p-4">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input type="checkbox" checked={selected} onChange={() => toggleSymptom(symptom.id)} />
                    {symptom.name}
                  </label>
                  {selected ? (
                    <div className="mt-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Severity</div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={selectedSymptoms[symptom.id]}
                        onChange={(event) =>
                          setSelectedSymptoms((current) => ({
                            ...current,
                            [symptom.id]: Number(event.target.value),
                          }))
                        }
                        className="w-full"
                      />
                      <div className="mt-1 text-sm muted">Level {selectedSymptoms[symptom.id]}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">3. What did you eat?</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {foodOptions.map((food) => {
              const selected = food.id in selectedFoods;
              return (
                <div key={food.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 p-4">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input type="checkbox" checked={selected} onChange={() => toggleFood(food.id)} />
                    {food.name}
                  </label>
                  {selected ? (
                    <div className="mt-3 grid gap-3">
                      <input
                        className="field"
                        placeholder="Quantity or serving"
                        value={selectedFoods[food.id]?.quantity ?? ""}
                        onChange={(event) =>
                          setSelectedFoods((current) => ({
                            ...current,
                            [food.id]: { ...current[food.id], quantity: event.target.value },
                          }))
                        }
                      />
                      <input
                        className="field"
                        placeholder="Notes"
                        value={selectedFoods[food.id]?.notes ?? ""}
                        onChange={(event) =>
                          setSelectedFoods((current) => ({
                            ...current,
                            [food.id]: { ...current[food.id], notes: event.target.value },
                          }))
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-2 font-medium">4. Sleep (hours)</div>
            <input className="field" value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} />
          </label>
          <div>
            <div className="mb-2 text-sm font-medium">5. Stress level</div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStressLevel(value)}
                  className={stressLevel === value ? "btn-primary px-4 py-2 text-sm" : "btn-secondary px-4 py-2 text-sm"}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="text-sm">
          <div className="mb-2 font-medium">Anything else to remember?</div>
          <textarea className="field min-h-[120px]" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <div className="mt-6">
        <button type="button" className="btn-primary" onClick={onSubmit} disabled={loading}>
          {loading ? "Saving..." : initialCheckin ? "Update today's check-in" : "Save today's check-in"}
        </button>
      </div>
    </section>
  );
}
