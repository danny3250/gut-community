import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckInForm from "./CheckInForm";
import { fetchHealthOptions, fetchTodayCheckinByUserId } from "@/lib/carebridge/health";

export default async function PortalCheckInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [todayCheckin, options] = await Promise.all([
    fetchTodayCheckinByUserId(supabase, user.id),
    fetchHealthOptions(supabase),
  ]);

  if (todayCheckin) {
    return (
      <main className="grid gap-5">
        <section className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Today’s check-in</span>
          <h1 className="mt-4 text-3xl font-semibold">You’ve already checked in today.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            Today’s summary is saved and ready for you or your provider to review later.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Overall feeling" value={`${todayCheckin.overall_feeling} / 5`} />
            <SummaryCard
              label="Symptoms logged"
              value={`${todayCheckin.checkin_symptoms?.length ?? 0}`}
            />
            <SummaryCard
              label="Foods logged"
              value={`${todayCheckin.checkin_foods?.length ?? 0}`}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/portal/health" className="btn-primary">
              View health history
            </Link>
            <Link href="/portal" className="btn-secondary">
              Return to dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <CheckInForm symptomOptions={options.symptoms} foodOptions={options.foods} />;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-sm leading-6 muted">{value}</div>
    </div>
  );
}
