import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";

const quickActions = [
  {
    title: "Daily check-in",
    description: "Log how you feel, symptoms, foods, sleep, and stress in under a minute.",
    href: "/portal/check-in",
  },
  {
    title: "Book care",
    description: "Find a provider and request a telehealth or follow-up visit without extra phone tag.",
    href: "/providers",
  },
  {
    title: "Messages",
    description: "Keep communication, reminders, and follow-ups in one private place.",
    href: "/portal/messages",
  },
  {
    title: "Forms and documents",
    description: "Complete intake details and keep shared paperwork close to the appointment workflow.",
    href: "/portal/forms",
  },
];

export default async function PortalDashboardPage() {
  const { displayName } = await getCurrentUserWithRole();
  const firstName = displayName?.split(" ")[0] || "there";

  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Patient dashboard</span>
          <h1 className="section-title">Welcome back, {firstName}.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            CareBridge is designed to make healthcare easier to reach by keeping scheduling, visit access,
            forms, resources, and community support connected in one calmer place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/portal/check-in" className="btn-primary">
              Daily check-in
            </Link>
            <Link href="/portal/appointments" className="btn-primary">
              View appointments
            </Link>
            <Link href="/providers" className="btn-secondary">
              Find a provider
            </Link>
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-5 py-5 sm:grid-cols-2">
          <MiniCard title="Upcoming visits" body="Telehealth and follow-up appointments in one timeline." />
          <MiniCard title="Daily health check" body="Track symptoms, foods, sleep, and stress without a long form." />
          <MiniCard title="Intake ready" body="Complete forms before visits to reduce check-in friction." />
          <MiniCard title="Resources" body="Return to trustworthy educational content and supportive wellness tools." />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {quickActions.map((item) => (
          <Link key={item.href} href={item.href} className="panel block px-5 py-5 hover:-translate-y-0.5">
            <div className="text-xl font-semibold">{item.title}</div>
            <p className="mt-2 text-sm leading-6 muted">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">What CareBridge is building toward</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StepCard step="1" title="Schedule care" body="Browse providers, pick a slot, and confirm with less back-and-forth." />
            <StepCard step="2" title="Prepare securely" body="Complete intake and consent steps before the visit begins." />
            <StepCard step="3" title="Join remotely" body="Use telehealth workflows that are ready for a future video vendor integration." />
          </div>
        </div>

        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">Support beyond the visit</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Recipes, educational resources, and community participation remain part of the platform as
            supportive content around care access, not as replacements for clinical guidance.
          </p>
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

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Step {step}</div>
      <div className="mt-2 text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6 muted">{body}</div>
    </div>
  );
}
