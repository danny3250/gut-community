import Link from "next/link";

const providerBenefits = [
  {
    title: "A professional point of entry",
    body: "CareBridge is designed to help patients find care, prepare for visits, and stay connected through scheduling, telehealth-ready workflows, and secure follow-up tools.",
  },
  {
    title: "Verified provider visibility",
    body: "Approved providers can appear in the public directory, accept bookings, support patients through the portal, and participate with verified provider identity where appropriate.",
  },
  {
    title: "Operational support that stays practical",
    body: "Provider scheduling, patient insights, forms, messaging, documents, and visit notes stay organized in one provider workspace.",
  },
];

const onboardingSteps = [
  "Create a provider applicant account through the dedicated provider application path.",
  "Complete your profile with credentials, specialty, license details, and the states you serve.",
  "CareBridge reviews applications before public listing, booking access, and verified provider actions are activated.",
];

const providerFaqs = [
  {
    question: "Who should apply?",
    answer: "CareBridge is built for licensed clinicians and other qualified care professionals who expect a reviewed onboarding process before becoming active on the platform.",
  },
  {
    question: "What happens after I apply?",
    answer: "Your application enters review. Public visibility, booking, telehealth launch privileges, and verified provider responses remain gated until approval.",
  },
  {
    question: "Can I use my existing patient account?",
    answer: "Provider applications are reviewed separately. If you are already signed in, CareBridge will pause before onboarding so you can continue intentionally instead of being converted automatically.",
  },
];

export default function ProviderJoinPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="space-y-5">
          <span className="eyebrow">For providers</span>
          <h1 className="section-title">Join CareBridge as a verified provider.</h1>
          <p className="max-w-2xl text-base leading-7 muted sm:text-lg">
            CareBridge gives providers a clearer way to reach patients, manage appointments, prepare for telehealth visits,
            and review intake context in one professional workspace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/providers/join/apply" className="btn-primary">
              Start provider application
            </Link>
            <Link href="/login?next=/providers/join/apply" className="btn-secondary">
              Sign in to continue
            </Link>
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-6 py-6">
          <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Application review
            </div>
            <div className="mt-3 text-2xl font-semibold">Public listing and booking activate after verification.</div>
            <p className="mt-2 text-sm leading-6 muted">
              CareBridge reviews credentials before providers become visible in the directory, bookable by patients, or active in verified provider features.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/40 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Best fit
            </div>
            <p className="mt-3 text-sm leading-6 muted">
              Licensed clinicians, telehealth-capable providers, and care teams who want a calmer patient experience with practical operational tools.
            </p>
          </div>
        </div>
      </section>

      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-2xl">
          <span className="eyebrow">Why join</span>
          <h2 className="mt-4 text-3xl font-semibold">Built to support care delivery, not just profile listings.</h2>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {providerBenefits.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <div className="text-xl font-semibold">{item.title}</div>
              <p className="mt-3 text-sm leading-6 muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">How onboarding works</span>
          <h2 className="mt-4 text-3xl font-semibold">A clear review path before activation.</h2>
          <div className="mt-5 space-y-4">
            {onboardingSteps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-6 muted">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Verified access</span>
          <h2 className="mt-4 text-3xl font-semibold">What approved providers can access.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Public provider profile and directory visibility",
              "Booking and appointment management",
              "Telehealth-ready visit workflows",
              "Patient messages, forms, and document review",
              "Patient insight history and visit notes",
              "Verified provider identity where applicable",
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--border)] bg-[var(--accent-soft)]/34 px-4 py-4 text-sm leading-6 muted">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Provider questions</span>
        <h2 className="mt-4 text-3xl font-semibold">A few things to know before you apply.</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {providerFaqs.map((item) => (
            <div key={item.question} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <div className="text-lg font-semibold">{item.question}</div>
              <p className="mt-3 text-sm leading-6 muted">{item.answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/providers/join/apply" className="btn-primary">
            Apply as a provider
          </Link>
          <Link href="/contact" className="btn-secondary">
            Contact CareBridge
          </Link>
        </div>
      </section>
    </main>
  );
}
