import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const platformPillars = [
  {
    title: "Public guidance",
    body: "Browse providers, resources, community discussions, and supportive wellness content before you ever create an account.",
  },
  {
    title: "Care access",
    body: "Move from discovery to scheduling and telehealth-ready visit workflows without juggling disconnected systems.",
  },
  {
    title: "Ongoing support",
    body: "Return to one secure portal for messages, forms, summaries, reminders, and follow-up steps after the visit.",
  },
];

const featureHighlights = [
  "Provider discovery and matching",
  "Telehealth-ready appointments",
  "Secure patient and provider portals",
  "Forms, documents, and care summaries",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="shell space-y-18 py-6 sm:space-y-24 sm:py-8">
      <section className="relative grid gap-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)] lg:items-start xl:gap-20">
        <div className="max-w-4xl pt-2 lg:pt-[8rem]">
          <div className="absolute left-[-3.15rem] top-[-8.65rem] hidden h-[20rem] w-[38rem] overflow-hidden lg:block xl:h-[22rem] xl:w-[41rem]">
            <Image
              src="/images/carebridge-logo.png"
              alt="CareBridge"
              width={1820}
              height={560}
              className="h-[21rem] w-auto max-w-none -translate-x-[1.15rem] -translate-y-[1.05rem] object-contain xl:h-[23.5rem] xl:-translate-x-[1.45rem] xl:-translate-y-[1.3rem]"
            />
          </div>
          <h1 className="hero-wordmark text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            A calmer way to connect people, providers, and care workflows.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 muted">
            CareBridge brings together provider discovery, scheduling, telehealth-ready visits, follow-up
            summaries, forms, and supportive health tools in one modern platform designed to reduce friction.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? "/portal" : "/signup"} className="btn-primary px-6 py-3.5">
              {user ? "Open Portal" : "Get Started"}
            </Link>
            <Link href="/providers" className="btn-secondary px-6 py-3.5">
              Find a Provider
            </Link>
          </div>

          <div className="mt-10 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
            {featureHighlights.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--health)]" />
                <span className="text-sm leading-6 muted">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[32rem] overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,rgba(31,111,91,0.12),rgba(79,182,168,0.08)_48%,rgba(255,255,255,0.62)_100%)] px-8 py-8 shadow-[0_24px_60px_rgba(31,77,57,0.08)] xl:px-10 xl:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(79,182,168,0.22),transparent_35%),radial-gradient(circle_at_85%_25%,rgba(109,190,69,0.18),transparent_28%),radial-gradient(circle_at_50%_85%,rgba(31,111,91,0.14),transparent_32%)]" />
          <div className="relative grid gap-6">
            <div className="bg-[rgba(255,252,246,0.8)] px-5 py-4 backdrop-blur-sm rounded-[16px]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Platform focus
              </div>
              <div className="mt-3 text-2xl font-semibold">
                Healthcare access that feels clear from the first click.
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2">
              <div className="metric-tile">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Patients
                </div>
                <div className="mt-2 text-lg font-semibold">Find care, prepare for visits, and stay connected.</div>
              </div>
              <div className="metric-tile">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Providers
                </div>
                <div className="mt-2 text-lg font-semibold">Manage appointments, notes, and follow-up from one workspace.</div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {platformPillars.map((pillar, index) => (
                <div key={pillar.title} className="bg-[rgba(255,252,246,0.72)] px-4 py-4 rounded-[16px]">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    0{index + 1}
                  </div>
                  <div className="mt-3 text-lg font-semibold">{pillar.title}</div>
                  <p className="mt-2 text-sm leading-6 muted">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="workspace-section">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Why CareBridge
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Built for healthcare workflows, not generic portal clutter.
            </h2>
          </div>
          <p className="text-sm leading-7 muted">
            CareBridge is designed to make it easier for patients to find the right starting point, for providers to
            run cleaner digital workflows, and for both sides to stay connected through preparation, visits, and
            follow-up.
          </p>
        </div>
      </section>
    </main>
  );
}
