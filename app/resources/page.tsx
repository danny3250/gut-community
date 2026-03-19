import Link from "next/link";
import PublicBrandMark from "@/app/components/PublicBrandMark";
import { resourceCategories } from "@/lib/content/resources";
import { BRAND } from "@/lib/config/brand";

export default function ResourcesPage() {
  return (
    <main className="shell space-y-10 py-6 sm:space-y-14 sm:py-10">
      <PublicBrandMark />

      <section className="relative -mt-[13.5rem] lg:-mt-[17rem]">
        <div className="grid gap-10 pt-3 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 pr-6">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Resources Menu
              </div>
              <nav className="mt-5 space-y-6" aria-label="Resources page sections">
                {resourceCategories.map((category) => (
                  <div key={category.id} className="space-y-3">
                    <a href={`#${category.id}`} className="block">
                      <span className="eyebrow">{category.title}</span>
                    </a>
                    <p className="text-sm leading-7 muted">{category.description}</p>
                    {category.entries[0] ? (
                      <a
                        href={category.entries[0].href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-sm font-semibold text-[var(--accent-strong)]"
                      >
                        Open {category.entries[0].source}
                      </a>
                    ) : null}
                  </div>
                ))}
              </nav>

              <div className="inline-panel px-5 py-5 text-sm leading-7 muted">
                If symptoms are severe, changing quickly, or affecting daily life, a doctor or registered dietitian can
                help you decide what deserves closer attention.
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/about" className="btn-secondary px-4 py-2 text-sm">
                    About CareBridge
                  </Link>
                  <Link href="/contact" className="btn-secondary px-4 py-2 text-sm">
                    Get support
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-12 lg:-mt-26">
            <section className="space-y-6">
              <div>
                <span className="eyebrow">Trusted resources</span>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold sm:text-5xl">
                  A clearer place to start when you need healthcare guidance, education, and practical support.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 muted">
                  This page brings together practical outside resources for care preparation, telehealth, chronic
                  condition support, and wellness-adjacent guidance so people can get oriented before and between
                  appointments.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/providers" className="btn-primary">
                  Browse providers
                </Link>
                <Link href="/signup" className="btn-secondary">
                  Create account
                </Link>
              </div>
            </section>

            <section className="workspace-section">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    How to use this page
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Start with the category closest to your question.</h2>
                </div>

                <div className="grid gap-3 text-sm leading-7 muted sm:text-base">
                  <p>This menu groups resources by the kind of support someone usually needs first.</p>
                  <p>Choose the category that feels most relevant, then open the outside resources that best match your situation.</p>
                  <p>Use these links as trusted educational starting points and bring medical questions to a qualified clinician when symptoms need direct care.</p>
                </div>
              </div>
            </section>

            {resourceCategories.map((category) => (
              <section key={category.id} id={category.id} className="workspace-section">
                <div className="space-y-6">
                  <div>
                    <span className="eyebrow">{category.title}</span>
                    <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">{category.title}</h2>
                    <p className="mt-4 max-w-4xl text-sm leading-7 muted sm:text-base">{category.description}</p>
                  </div>

                  <div className="grid gap-5">
                    {category.entries.map((entry) => (
                      <div key={entry.title} className="data-row first:border-t-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                          {entry.source}
                        </div>
                        <div className="mt-2 text-2xl font-semibold">{entry.title}</div>
                        <p className="mt-3 max-w-4xl text-sm leading-7 muted sm:text-base">
                          {entry.description} This resource is useful when you want clearer orientation, stronger
                          questions for a visit, or a more grounded understanding of what to do next.
                        </p>
                        <div className="mt-4">
                          <a
                            href={entry.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-[var(--accent-strong)]"
                          >
                            Open resource
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}

            <section id="next-steps" className="workspace-section">
              <div>
                <h2 className="text-2xl font-semibold sm:text-3xl">A supportive guide, not a substitute for care.</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 muted sm:text-base">
                  {BRAND.name} is here to help people organize next steps, return to useful resources, and reach care
                  more easily. It is not a substitute for professional medical advice, diagnosis, or treatment.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
