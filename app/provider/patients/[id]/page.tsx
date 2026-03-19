import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PatientAnalyticsPanel from "./PatientAnalyticsPanel";
import { createClient } from "@/lib/supabase/server";
import { getPatientCheckinSummaryForProvider } from "@/lib/carebridge/checkins";
import { fetchRecentProviderNotesForPatient, getProviderVisitNotePreview } from "@/lib/carebridge/provider-notes";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";

type ProviderPatientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProviderPatientDetailPage({ params }: ProviderPatientDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/portal");

  const [detail, recentNotes] = await Promise.all([
    getPatientCheckinSummaryForProvider(supabase, provider.id, id),
    fetchRecentProviderNotesForPatient(supabase, provider.id, id),
  ]);
  if (!detail) notFound();

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href="/provider/patients" className="text-sm muted hover:text-[var(--foreground)]">
          Back to patients
        </Link>
        <span className="mt-4 block eyebrow">Patient health trend</span>
        <h1 className="mt-3 text-3xl font-semibold">{detail.patient.legal_name || detail.patient.email || "Patient"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          This view is read-only and meant to support telehealth preparation with recent self-reported symptoms, foods, sleep, and stress.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SummaryPanel
          title="Recent check-in overview"
          items={[
            {
              label: "Average feeling",
              value: detail.analytics.overview.averageFeeling ? `${detail.analytics.overview.averageFeeling} / 5` : "No data",
              helper: formatDirection(detail.analytics.overview.feelingDirection, "vs earlier check-ins"),
            },
            {
              label: "Average sleep",
              value: detail.analytics.overview.averageSleepHours ? `${detail.analytics.overview.averageSleepHours} hrs` : "No data",
              helper: formatDirection(detail.analytics.overview.sleepDirection, "recent sleep trend"),
            },
            {
              label: "Average stress",
              value: detail.analytics.overview.averageStressLevel ? `${detail.analytics.overview.averageStressLevel} / 5` : "No data",
              helper: formatDirection(detail.analytics.overview.stressDirection, "recent stress trend"),
            },
          ]}
        />
        <SummaryPanel
          title="Recurring patterns"
          items={[
            {
              label: "Common symptom",
              value: detail.analytics.overview.mostCommonSymptom ?? "No data",
              helper: `${detail.analytics.overview.recentCheckinCount} recent check-ins`,
            },
            {
              label: "Common food",
              value: detail.analytics.overview.mostCommonFood ?? "No data",
              helper: "Recent food pattern",
            },
          ]}
        />
      </section>

      <PatientAnalyticsPanel
        feelingTrend={detail.analytics.feelingTrend}
        sleepStressTrend={detail.analytics.sleepStressTrend}
        symptomFrequency={detail.analytics.symptomFrequency}
        foodFrequency={detail.analytics.foodFrequency}
      />

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Recent check-ins</h2>
        <div className="mt-5 grid gap-4">
          {detail.recentCheckins.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 text-sm muted">
              No daily health check-ins have been logged yet.
            </div>
          ) : (
            detail.recentCheckins.map((checkin) => {
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

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Recent provider notes</h2>
        <div className="mt-5 grid gap-4">
          {recentNotes.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 text-sm muted">
              No prior notes available for this patient.
            </div>
          ) : (
            recentNotes.map((note) => {
              const appointment = Array.isArray(note.appointments) ? note.appointments[0] ?? null : note.appointments ?? null;
              return (
                <div key={note.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold">{note.subject ?? "Visit note"}</div>
                      <div className="mt-1 text-sm muted">
                        {appointment
                          ? new Intl.DateTimeFormat("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: appointment.timezone,
                            }).format(new Date(appointment.start_time))
                          : "Appointment note"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs capitalize">
                        {note.status}
                      </span>
                      {appointment?.id ? (
                        <Link href={`/provider/appointments/${appointment.id}`} className="btn-secondary px-4 py-2 text-sm">
                          Open note context
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 muted">{getProviderVisitNotePreview(note.note_body)}</p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

function SummaryPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; helper: string }>;
}) {
  return (
    <section className="panel px-5 py-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className={`mt-4 grid gap-4 ${items.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {items.map((item) => (
          <div key={item.label} className="rounded-[20px] border border-[var(--border)] bg-white/72 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{item.label}</div>
            <div className="mt-2 text-xl font-semibold">{item.value}</div>
            <div className="mt-2 text-sm muted">{item.helper}</div>
          </div>
        ))}
      </div>
    </section>
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

function formatDirection(direction: "up" | "down" | "steady", context: string) {
  if (direction === "up") return `Trending up ${context}`;
  if (direction === "down") return `Trending down ${context}`;
  return `Stable ${context}`;
}
