import Link from "next/link";
import { BRAND } from "@/lib/config/brand";

const helpTopics = [
  "Questions about your account or sign-in",
  "Problems with recipes, links, or page content",
  "Accessibility issues or trouble using the site",
  "Feedback on what would make the platform more helpful",
];

export default function ContactPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Contact and support</span>
          <h1 className="section-title">Reach out when something is not working or when you need help finding your way.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            Support should feel clear and human. If you run into trouble with your account, have questions
            about the site, or want to share feedback, this is where that conversation can start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Join members
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
          </div>
        </div>

        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Common reasons to reach out
          </div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            {helpTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">What support here should feel like</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoBlock
              title="Clear"
              body="You should be able to figure out where to go next without digging through a maze of pages."
            />
            <InfoBlock
              title="Human"
              body="The tone should feel steady and respectful, especially for people already dealing with stressful symptoms."
            />
            <InfoBlock
              title="Practical"
              body="Questions about your account, recipes, or site experience should be easy to raise."
            />
            <InfoBlock
              title="Grounded"
              body="Support here is for the platform itself, not for urgent or individualized medical advice."
            />
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Where to go next</h2>
          <p className="mt-3 text-sm leading-6 muted sm:text-base">
            If you are just getting started, the fastest way to get value from {BRAND.name} is to browse providers,
            services, and public resources first, then create an account if you want portal access and ongoing support.
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
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Support that stays grounded</h2>
          <p className="mt-3 text-sm leading-6 muted sm:text-base">
            {BRAND.name} can help with site support, account issues, and platform questions. It is not a
            place to get urgent medical advice.
          </p>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Need immediate care?</h2>
          <p className="mt-3 text-sm leading-6 muted sm:text-base">
            If symptoms feel severe, urgent, or alarming, it is best to contact a healthcare professional or
            emergency service rather than wait for a response here.
          </p>
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
    </div>
  );
}
