import Link from "next/link";
import PublicBrandMark from "@/app/components/PublicBrandMark";
import { BRAND } from "@/lib/config/brand";

const helpTopics = [
  "Questions about your account or sign-in",
  "Problems with recipes, links, or page content",
  "Accessibility issues or trouble using the site",
  "Feedback on what would make the platform more helpful",
];

const supportPrinciples = [
  {
    title: "Clear",
    body: "You should be able to understand where to go next without digging through a maze of pages or conflicting instructions.",
  },
  {
    title: "Human",
    body: "The tone should feel steady and respectful, especially for people already navigating symptoms, appointments, or provider decisions.",
  },
  {
    title: "Practical",
    body: "Questions about your account, recipes, community tools, or general site use should be easy to raise and easy to route.",
  },
  {
    title: "Grounded",
    body: "Support here is for the platform itself. It is not a substitute for urgent or individualized medical care.",
  },
];

export default function ContactPage() {
  return (
    <main className="shell space-y-10 py-6 sm:space-y-14 sm:py-10">
      <PublicBrandMark />

      <section className="relative -mt-[13.5rem] lg:-mt-[17rem]">
        <div className="grid gap-10 pt-3 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 pr-6">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Contact and support
              </div>
              <p className="text-sm leading-7 muted">
                Use this page when something is not working, when you need help navigating CareBridge, or when you want
                to share thoughtful feedback about the platform.
              </p>

              <div className="space-y-4">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
                  Common reasons to reach out
                </div>
                <ul className="space-y-3 text-sm leading-7 muted">
                  {helpTopics.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              </div>

              <div className="inline-panel px-5 py-5 text-sm leading-7 muted">
                If you are just getting started, the fastest way to get oriented is usually to review services,
                browse providers, and explore public resources before opening a full portal workflow.
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/services" className="btn-secondary px-4 py-2 text-sm">
                    View services
                  </Link>
                  <Link href="/providers" className="btn-secondary px-4 py-2 text-sm">
                    Browse providers
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-10 lg:-mt-26">
            <section className="space-y-6">
              <div>
                <span className="eyebrow">Contact and support</span>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold sm:text-5xl">
                  Reach out when something is not working or when you need help finding your way.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 muted">
                  Support should feel clear and human. If you run into trouble with your account, have questions about
                  the site, or want to share feedback, this is where that conversation can start.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/signup" className="btn-primary">
                  Join members
                </Link>
                <Link href="/login" className="btn-secondary">
                  Sign in
                </Link>
              </div>
            </section>

            <section className="workspace-section">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    How support should feel
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                    Clear enough to guide people forward without adding more friction.
                  </h2>
                </div>

                <div className="grid gap-3 text-sm leading-7 muted sm:text-base">
                  <p>Use this page for platform support, account questions, usability issues, and thoughtful product feedback.</p>
                  <p>If you are not sure where your question belongs yet, start here and keep the message practical and specific.</p>
                  <p>For urgent medical needs, a healthcare professional or emergency service is still the right path instead of waiting for a site response.</p>
                </div>
              </div>
            </section>

            <section className="workspace-section">
              <div className="grid gap-6 lg:grid-cols-2">
                {supportPrinciples.map((item) => (
                  <div key={item.title} className="data-row first:border-t-0">
                    <h2 className="text-2xl font-semibold">{item.title}</h2>
                    <p className="mt-3 text-sm leading-7 muted sm:text-base">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="workspace-section">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">Where to go next</h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 muted sm:text-base">
                    If you are still getting oriented, the fastest way to get value from {BRAND.name} is to browse
                    providers, services, and public resources first, then create an account if you want portal access
                    and ongoing support.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/providers" className="btn-secondary px-4 py-2 text-sm">
                      Browse providers
                    </Link>
                    <Link href="/resources" className="btn-secondary px-4 py-2 text-sm">
                      Browse resources
                    </Link>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">Need immediate care?</h2>
                  <p className="mt-4 text-sm leading-7 muted sm:text-base">
                    {BRAND.name} can help with site support, account questions, and platform guidance. If symptoms feel
                    severe, urgent, or alarming, it is best to contact a healthcare professional or emergency service
                    rather than wait for a response here.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
