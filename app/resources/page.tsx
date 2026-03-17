import Link from "next/link";
import { resourceCategories } from "@/lib/content/resources";
import { BRAND } from "@/lib/config/brand";

export default function ResourcesPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Trusted resources</span>
          <h1 className="section-title">A trusted place to start when you want clearer healthcare guidance and patient resources.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            This page gathers practical outside resources for care preparation, telehealth, chronic condition
            support, and wellness-adjacent guidance so people can get oriented before and between appointments.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/providers" className="btn-primary">
              Find providers
            </Link>
            <Link href="/signup" className="btn-secondary">
              Create account
            </Link>
          </div>
        </div>

        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            How to use this page
          </div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            <li>Start with the category that matches what you are trying to understand right now.</li>
            <li>Use these links as reputable educational references, not one-size-fits-all answers.</li>
            <li>Bring questions or concerns to a qualified healthcare professional when symptoms need medical attention.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">What you will find here</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 muted">
            <p>Patient-friendly educational resources from established organizations.</p>
            <p>Telehealth preparation and remote-care support materials.</p>
            <p>Chronic condition and advocacy organizations where ongoing support matters.</p>
            <p>Nutrition and wellness-support references that can complement clinical care.</p>
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">How to use these resources</h2>
          <p className="mt-3 text-sm leading-6 muted sm:text-base">
            These links are here to help people learn, prepare better questions, and feel less lost. They are
            not meant to replace professional care or suggest that every digestive problem has the same answer.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/about" className="btn-secondary px-4 py-2 text-sm">
              About CareBridge
            </Link>
            <Link href="/contact" className="btn-secondary px-4 py-2 text-sm">
              Get support
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        {resourceCategories.map((category) => (
          <section key={category.id} className="panel px-6 py-6 sm:px-8">
            <div className="max-w-3xl">
              <span className="eyebrow">{category.title}</span>
              <p className="mt-4 text-sm leading-6 muted sm:text-base">{category.description}</p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {category.entries.map((entry) => (
                <a
                  key={entry.title}
                  href={entry.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[24px] border border-[var(--border)] bg-white/74 px-5 py-5 hover:-translate-y-0.5"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {entry.source}
                  </div>
                  <div className="mt-2 text-xl font-semibold">{entry.title}</div>
                  <p className="mt-2 text-sm leading-6 muted">{entry.description}</p>
                  <div className="mt-4 text-sm font-semibold text-[var(--accent-strong)]">
                    Open resource
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="panel grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <h2 className="text-2xl font-semibold">A supportive guide, not a substitute for care.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 muted sm:text-base">
            {BRAND.name} is here to help people organize next steps, return to useful resources, and reach care
            more easily. It is not a substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/42 px-5 py-5 text-sm leading-6 muted">
          If symptoms are severe, changing quickly, or affecting daily life, a doctor or registered dietitian can
          help you decide what deserves closer attention.
        </div>
      </section>
    </main>
  );
}
