import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckInForm from "./CheckInForm";
import { fetchHealthOptions, getTodaysCheckin } from "@/lib/carebridge/checkins";

type PortalCheckInPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function PortalCheckInPage({ searchParams }: PortalCheckInPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [todayCheckin, options] = await Promise.all([
    getTodaysCheckin(supabase, user.id),
    fetchHealthOptions(supabase),
  ]);

  if (todayCheckin && resolvedSearchParams.edit !== "1") {
    const lifestyle = Array.isArray(todayCheckin.lifestyle_metrics)
      ? todayCheckin.lifestyle_metrics[0] ?? null
      : todayCheckin.lifestyle_metrics ?? null;

    return (
      <main className="grid gap-5">
        <section className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Today's check-in</span>
          <h1 className="mt-4 text-3xl font-semibold">You've already checked in today.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            Today's summary is saved and ready for you or your provider to review later.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Overall feeling" value={`${todayCheckin.overall_feeling} / 5`} />
            <SummaryCard label="Symptoms logged" value={`${todayCheckin.checkin_symptoms?.length ?? 0}`} />
            <SummaryCard label="Foods logged" value={`${todayCheckin.checkin_foods?.length ?? 0}`} />
            <SummaryCard label="Stress level" value={lifestyle?.stress_level ? `${lifestyle.stress_level} / 5` : "Not logged"} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/portal/check-in?edit=1" className="btn-primary">
              Edit today's check-in
            </Link>
            <Link href="/portal/health" className="btn-secondary">
              View health history
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <CheckInForm
      symptomOptions={options.symptoms}
      foodOptions={options.foods}
      initialCheckin={todayCheckin}
    />
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-sm leading-6 muted">{value}</div>
    </div>
  );
}
