import Link from "next/link";

const providers = [
  { name: "Dr. Maya Chen", specialty: "Primary care", states: "CA, OR, WA", telehealth: "Telehealth available" },
  { name: "Jordan Patel, NP", specialty: "Chronic care follow-up", states: "TX, FL", telehealth: "Telehealth available" },
  { name: "North Harbor Care Group", specialty: "Behavioral and family health", states: "NY", telehealth: "Hybrid organization" },
];

export default function ProvidersPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Providers</span>
          <h1 className="section-title">Find providers and organizations offering easier access to care.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            CareBridge is structured to support both independent providers and organizations, with room for telehealth, follow-up care, and scheduling workflows.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">Create account</Link>
            <Link href="/services" className="btn-secondary">Explore services</Link>
          </div>
        </div>
        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Directory direction</div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            <li>Telehealth-enabled providers</li>
            <li>Independent and organization-based care models</li>
            <li>Scheduling and intake-ready provider access</li>
          </ul>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {providers.map((provider) => (
          <div key={provider.name} className="panel px-6 py-6">
            <div className="text-xl font-semibold">{provider.name}</div>
            <div className="mt-2 text-sm muted">{provider.specialty}</div>
            <div className="mt-3 text-sm leading-6 muted">{provider.states}</div>
            <div className="mt-1 text-sm leading-6 muted">{provider.telehealth}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
