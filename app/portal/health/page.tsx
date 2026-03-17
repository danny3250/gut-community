import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecipeRelevantSignals, getUserRecentCheckins, summarizeCheckinTrends } from "@/lib/carebridge/checkins";

type PortalHealthPageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function PortalHealthPage({ searchParams }: PortalHealthPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [checkins, recipeSignals] = await Promise.all([
    getUserRecentCheckins(supabase, user.id, 14),
    getRecipeRelevantSignals(supabase, user.id),
  ]);
  const trends = summarizeCheckinTrends(checkins);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Health history</span>
            <h1 className="mt-4 text-3xl font-semibold">Track how you've been feeling over time.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 muted">
              Daily check-ins give you a simple record of symptoms, foods, sleep, and stress that can support future telehealth visits and recipe recommendations.
            </p>
          </div>
          <Link href="/portal/check-in" className="btn-primary">
            Daily check-in
          </Link>
        </div>
        {resolvedSearchParams.saved === "1" ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">
            Today's check-in has been saved.
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <TrendCard label="Recent average feeling" value={trends.averageFeeling ? `${trends.averageFeeling} / 5` : "No data yet"} />
        <TrendCard label="Average sleep" value={trends.averageSleepHours ? `${trends.averageSleepHours} hrs` : "No data yet"} />
        <TrendCard label="Average stress" value={trends.averageStressLevel ? `${trends.averageStressLevel} / 5` : "No data yet"} />
        <TrendCard label="Recent check-ins" value={`${recipeSignals.recentCheckinCount}`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <TrendList title="Most common symptoms" items={trends.symptomFrequency.map((item) => `${item.name} (${item.count})`)} emptyText="No symptoms logged yet." />
        <TrendList title="Recently logged foods" items={trends.recentFoods.map((item) => `${item.name} (${item.count})`)} emptyText="No foods logged yet." />
        <TrendList
          title="Recipe signals"
          items={[
            ...recipeSignals.commonSymptoms.map((item) => `Symptom: ${item}`),
            ...recipeSignals.commonFoods.map((item) => `Food: ${item}`),
          ].slice(0, 6)}
          emptyText="Signals for future recipe recommendations will appear here."
        />
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Recent check-ins</h2>
        <div className="mt-5 grid gap-4">
          {checkins.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <h3 className="text-lg font-semibold">You haven't logged a check-in yet.</h3>
              <p className="mt-2 text-sm leading-6 muted">
                Your recent health check-ins will appear here once you start tracking them.
              </p>
            </div>
          ) : (
            checkins.map((checkin) => {
              const lifestyle = Array.isArray(checkin.lifestyle_metrics) ? checkin.lifestyle_metrics[0] : checkin.lifestyle_metrics;
              return (
                <div key={checkin.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold">{checkin.checkin_date}</div>
                      <div className="mt-1 text-sm muted">Overall feeling: {checkin.overall_feeling} / 5</div>
                    </div>
                    <div className="text-sm muted">
                      Sleep: {lifestyle?.sleep_hours ?? "-"} hrs | Stress: {lifestyle?.stress_level ?? "-"} / 5
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <TrendList
                      title="Symptoms"
                      items={(checkin.checkin_symptoms ?? []).map((row) => {
                        const symptom = Array.isArray(row.symptoms) ? row.symptoms[0] : row.symptoms;
                        return symptom ? `${symptom.name} (${row.severity}/5)` : null;
                      }).filter((item): item is string => !!item)}
                      emptyText="No symptoms logged."
                    />
                    <TrendList
                      title="Foods"
                      items={(checkin.checkin_foods ?? []).map((row) => {
                        const food = Array.isArray(row.foods) ? row.foods[0] : row.foods;
                        return food ? `${food.name}${row.quantity ? ` (${row.quantity})` : ""}` : null;
                      }).filter((item): item is string => !!item)}
                      emptyText="No foods logged."
                    />
                  </div>
                  {checkin.notes ? <p className="mt-4 text-sm leading-6 muted">{checkin.notes}</p> : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

function TrendCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-5 py-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TrendList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-sm muted">{emptyText}</div>
      ) : (
        <ul className="mt-3 space-y-2 text-sm muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
