import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/config/brand";

const howItWorks = [
  {
    title: "Find the right starting point",
    body: "Browse providers, services, educational resources, and supportive wellness content before you ever log in.",
  },
  {
    title: "Get care with less friction",
    body: "Use scheduling and telehealth-ready workflows designed to cut down on commuting, confusion, and back-and-forth.",
  },
  {
    title: "Stay connected over time",
    body: "Return to your portal for appointments, messages, forms, resources, and community support.",
  },
];

const resourcePreview = [
  "Patient-friendly educational resources",
  "How to prepare for a telehealth visit",
  "Questions to ask your provider",
  "Recipes and wellness-support content where it helps",
];

const portalPreview = [
  "Appointments and visit access",
  "Messages and reminders",
  "Forms, documents, and shared care prep",
  "Saved resources and community participation",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="shell space-y-10 py-6 sm:space-y-12 sm:py-10">
      <section className="panel grid gap-8 overflow-hidden px-6 py-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:py-12">
        <div className="space-y-6">
          <span className="eyebrow">{BRAND.tagline}</span>
          <div className="space-y-4">
            <h1 className="section-title max-w-4xl">Healthcare access that feels easier for patients and faster for providers.</h1>
            <p className="max-w-2xl text-base leading-7 muted sm:text-lg">
              {BRAND.name} brings together public health information, provider access, community support,
              scheduling, and telehealth-ready workflows in one calmer platform. It is built to reduce friction,
              not add more portal complexity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/providers" className="btn-primary">
              Find a provider
            </Link>
            <Link href={user ? "/portal" : "/signup"} className="btn-secondary">
              {user ? "Open patient portal" : "Get started"}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat title="Patients" body="Find care, prepare for visits, and stay connected in one place." />
            <HeroStat title="Providers" body="Reach patients faster and reduce unnecessary workflow friction." />
            <HeroStat title="Public support" body="Resources, articles, community, and wellness content stay accessible." />
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-6 py-6">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/45 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Telehealth convenience
            </div>
            <div className="mt-3 text-2xl font-semibold">Care without the usual commute burden.</div>
            <p className="mt-2 text-sm leading-6 muted">
              The platform is being structured for appointment-based remote visits, waiting room flows, and secure provider launch paths.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border)] bg-white/78 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Public and private
            </div>
            <div className="mt-3 text-2xl font-semibold">Resources publicly, workflows privately.</div>
            <p className="mt-2 text-sm leading-6 muted">
              CareBridge keeps educational content and supportive materials open while protecting patient, provider, and admin workflows behind role-based access.
            </p>
          </div>
        </div>
      </section>

      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-2xl">
          <span className="eyebrow">How CareBridge works</span>
          <h2 className="mt-4 text-3xl font-semibold">A bridge between public guidance and real care access.</h2>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {howItWorks.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <div className="text-xl font-semibold">{item.title}</div>
              <p className="mt-2 text-sm leading-6 muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Resources and wellness support</span>
          <h2 className="mt-4 text-3xl font-semibold">Public information that helps people get oriented.</h2>
          <div className="mt-4 space-y-3">
            {resourcePreview.map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm leading-6 muted">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link href="/resources" className="btn-secondary">
              Browse resources
            </Link>
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Provider access</span>
          <h2 className="mt-4 text-3xl font-semibold">Help patients reach the right care faster.</h2>
          <p className="mt-3 text-sm leading-6 muted">
            CareBridge supports provider discovery, scheduling, telehealth-ready visit flows, and future organization-based healthcare operations.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/providers" className="btn-primary">
              View providers
            </Link>
            <Link href="/services" className="btn-secondary">
              Explore services
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Community</span>
          <h2 className="mt-4 text-3xl font-semibold">Discussion, support, and moderated participation.</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Community stays part of the product through patient discussion and future provider-authored guidance,
            while staying clearly distinct from formal medical advice.
          </p>
          <div className="mt-5">
            <Link href="/community" className="btn-secondary">
              Explore community
            </Link>
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Patient portal preview</span>
          <h2 className="mt-4 text-3xl font-semibold">The member portal keeps care steps connected.</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {portalPreview.map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--border)] bg-[var(--accent-soft)]/38 px-4 py-4 text-sm leading-6 muted">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-strong px-6 py-8 sm:px-8">
        <span className="eyebrow">Get started</span>
        <h2 className="mt-4 text-3xl font-semibold">Make healthcare easier to reach.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Browse providers, explore public resources, or sign up to use the patient portal and future telehealth workflows.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/providers" className="btn-primary">
            Find a provider
          </Link>
          <Link href="/resources" className="btn-secondary">
            Browse resources
          </Link>
          <Link href={user ? "/portal" : "/signup"} className="btn-secondary">
            {user ? "Open portal" : "Create account"}
          </Link>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/55 px-4 py-4">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6 muted">{body}</div>
    </div>
  );
}
