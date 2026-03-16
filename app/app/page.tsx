import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";

export default async function AppDashboardPage() {
  const { user, displayName, role } = await getCurrentUserWithRole();
  const firstName = displayName || user?.email?.split("@")[0] || "there";

  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <span className="eyebrow">Dashboard</span>
          <h1 className="section-title">Welcome back, {firstName}.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            The center of gravity here is tracking, insight, reflection, and action. Recipes and
            community still matter, but they support the main experience instead of replacing it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/check-in" className="btn-primary">
              Start today&apos;s gut check
            </Link>
            <Link href="/app/analysis" className="btn-secondary">
              View analysis
            </Link>
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-5 py-5 sm:grid-cols-2">
          <MiniStat value="Daily check-ins" label="Low-burden reflection designed to take around 10 seconds." />
          <MiniStat value="History" label="A calm place to review patterns over time without guilt language." />
          <MiniStat value="Analysis" label="Explainable trend summaries and gentle experiments to test." />
          <MiniStat value="Role" label={role ? `Current role: ${role}.` : "User role available for future gating."} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DashboardCard
          title="Daily Gut Check"
          description="Log how your gut felt today, add a few symptom tags when needed, and keep the burden light."
          href="/app/check-in"
        />
        <DashboardCard
          title="History"
          description="Review recent days, notice gentle trends, and pick up where you left off if you missed time."
          href="/app/history"
        />
        <DashboardCard
          title="Analysis"
          description="See early rule-based observations that explain why the app is surfacing a possible pattern."
          href="/app/analysis"
        />
        <DashboardCard
          title="Shopping list"
          description="Combine ingredients from your saved recipes and carry them into a cleaner grocery plan."
          href="/app/shopping-list"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">Today&apos;s suggested path</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PathCard step="1" title="Check in" description="Capture how today felt in a few taps." />
            <PathCard step="2" title="Reflect" description="Review recent days without needing perfect data." />
            <PathCard step="3" title="Act" description="Use gentle next-step suggestions and supportive content." />
          </div>
        </div>

        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">Supportive content</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 muted">
            <p>Recipes and forums stay available, but they sit beside the core workflow instead of competing with it.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/recipes" className="btn-secondary px-4 py-2 text-sm">
                Browse recipes
              </Link>
              <Link href="/forum" className="btn-secondary px-4 py-2 text-sm">
                Open forum
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="panel block px-5 py-5 hover:-translate-y-0.5">
      <div className="text-xl font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 muted">{description}</p>
    </Link>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/55 px-4 py-4">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 muted">{label}</div>
    </div>
  );
}

function PathCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/70 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        Step {step}
      </div>
      <div className="mt-2 text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6 muted">{description}</div>
    </div>
  );
}
