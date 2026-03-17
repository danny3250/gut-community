import Link from "next/link";

export default function ProviderDashboardPage() {
  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Provider dashboard</span>
          <h1 className="section-title">A smoother way to reach patients without the usual portal friction.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            CareBridge is built to help providers handle remote visits, review intake information, manage
            appointments, and communicate with patients through a cleaner workflow foundation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/provider/schedule" className="btn-primary">
              Open schedule
            </Link>
            <Link href="/provider/patients" className="btn-secondary">
              Review patients
            </Link>
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-5 py-5 sm:grid-cols-2">
          <MiniCard title="Today's visits" body="See upcoming telehealth and follow-up appointments at a glance." />
          <MiniCard title="Intake review" body="Prepare for visits by checking patient forms and shared context." />
          <MiniCard title="Launch visits" body="Use a future Chime-backed session flow through an adapter layer." />
          <MiniCard title="Organization data" body="Keep practice or clinic metadata ready for multi-provider growth." />
        </div>
      </section>
    </>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/55 px-4 py-4">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-2 text-sm leading-6 muted">{body}</div>
    </div>
  );
}
