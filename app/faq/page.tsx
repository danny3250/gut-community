import Link from "next/link";
import PublicBrandMark from "@/app/components/PublicBrandMark";

const faqs = [
  {
    question: "Is CareBridge only for telehealth?",
    answer:
      "No. Telehealth is an important part of the platform, but CareBridge also includes provider discovery, public resources, patient portal features, provider workflows, and post-visit follow-up tools.",
    audience: "General",
    topic: "Platform overview",
  },
  {
    question: "Are resources, recipes, and articles public?",
    answer:
      "Yes. Public education, supportive recipes, provider browsing, and community reading remain available without signing in so people can explore before committing to an account.",
    audience: "General",
    topic: "Public access",
  },
  {
    question: "Does CareBridge replace medical advice?",
    answer:
      "No. CareBridge is designed to make care easier to reach and organize, not to replace professional medical judgment, diagnosis, treatment, or emergency services.",
    audience: "General",
    topic: "Medical guidance",
  },
  {
    question: "Can providers use CareBridge too?",
    answer:
      "Yes. CareBridge includes provider workflows for appointments, notes, patient insights, follow-up summaries, telehealth-ready visit experiences, and portal-based communication.",
    audience: "Providers",
    topic: "Provider workflows",
  },
  {
    question: "Do patients need an account to book or follow up with a provider?",
    answer:
      "People can browse public information without an account, but signed-in patient access is what unlocks appointment management, health tracking, follow-up summaries, documents, and notifications in one place.",
    audience: "Patients",
    topic: "Patient access",
  },
  {
    question: "How does provider verification work?",
    answer:
      "Provider applications are reviewed before they appear publicly in the directory or become bookable. This helps the public-facing provider list stay intentional and trustworthy.",
    audience: "Providers",
    topic: "Verification",
  },
  {
    question: "Can CareBridge support ongoing care between visits?",
    answer:
      "Yes. The platform is built to support continuity through check-ins, follow-up summaries, documents, reminders, patient-provider relationships, and shared visit context.",
    audience: "Patients",
    topic: "Continuity",
  },
  {
    question: "What kinds of healthcare support can fit inside CareBridge?",
    answer:
      "CareBridge is designed as a broader healthcare access and support platform. It can support primary care, specialty care, telehealth, education, community support, wellness content, and condition-aware follow-up.",
    audience: "General",
    topic: "Platform overview",
  },
];

type FaqPageProps = {
  searchParams: Promise<{
    q?: string;
    audience?: string;
    topic?: string;
  }>;
};

export default async function FaqPage({ searchParams }: FaqPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q?.trim().toLowerCase() ?? "";
  const audienceFilter = resolvedSearchParams.audience?.trim() ?? "";
  const topicFilter = resolvedSearchParams.topic?.trim() ?? "";

  const audiences = Array.from(new Set(faqs.map((item) => item.audience))).sort();
  const topics = Array.from(new Set(faqs.map((item) => item.topic))).sort();

  const filteredFaqs = faqs.filter((item) => {
    const matchesQuery =
      query.length === 0 ||
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query) ||
      item.topic.toLowerCase().includes(query) ||
      item.audience.toLowerCase().includes(query);

    const matchesAudience = audienceFilter.length === 0 || item.audience === audienceFilter;
    const matchesTopic = topicFilter.length === 0 || item.topic === topicFilter;

    return matchesQuery && matchesAudience && matchesTopic;
  });

  return (
    <main className="shell space-y-10 py-6 sm:space-y-14 sm:py-10">
      <PublicBrandMark />

      <section className="relative -mt-[13.5rem] lg:-mt-[17rem]">
        <div className="grid gap-10 pt-3 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 pr-6">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                FAQ Filters
              </div>
              <p className="text-sm leading-7 muted">
                Search questions by topic, audience, or common platform concerns to get to the right answer faster.
              </p>

              <form className="space-y-5">
                <label className="block text-sm">
                  <div className="mb-2 font-medium">Search</div>
                  <input
                    type="text"
                    name="q"
                    defaultValue={resolvedSearchParams.q ?? ""}
                    className="field"
                    placeholder="Search questions or answers"
                  />
                </label>

                <label className="block text-sm">
                  <div className="mb-2 font-medium">Audience</div>
                  <select name="audience" defaultValue={audienceFilter} className="field">
                    <option value="">All audiences</option>
                    {audiences.map((audience) => (
                      <option key={audience} value={audience}>
                        {audience}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <div className="mb-2 font-medium">Topic</div>
                  <select name="topic" defaultValue={topicFilter} className="field">
                    <option value="">All topics</option>
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="btn-primary">
                    Apply filters
                  </button>
                  <Link href="/faq" className="btn-secondary">
                    Clear
                  </Link>
                </div>
              </form>

              <div className="inline-panel px-5 py-5 text-sm leading-7 muted">
                If your question is not covered here yet, the quickest next steps are usually to review the services
                page, browse providers, or contact CareBridge directly.
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/services" className="btn-secondary px-4 py-2 text-sm">
                    View services
                  </Link>
                  <Link href="/contact" className="btn-secondary px-4 py-2 text-sm">
                    Contact support
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-10 lg:-mt-26">
            <section className="space-y-6">
              <div>
                <span className="eyebrow">FAQ</span>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold sm:text-5xl">
                  Questions people may have as CareBridge continues to take shape.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 muted">
                  This page answers common questions about how CareBridge works, what stays public, how care access
                  fits together, and what patients and providers can expect from the platform.
                </p>
              </div>
            </section>

            <section className="workspace-section">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    How to use this page
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                    Start with search or filter by the kind of question you have.
                  </h2>
                </div>

                <div className="grid gap-3 text-sm leading-7 muted sm:text-base">
                  <p>Use the left menu to narrow answers by audience and topic when you already know the general area you are asking about.</p>
                  <p>Search works across the question text and answer text, so it is useful when you only remember part of a phrase.</p>
                  <p>If you still do not find what you need, the contact page is the best next step for a more direct answer.</p>
                </div>
              </div>
            </section>

            <section className="workspace-section lg:hidden">
              <form className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="mb-2 font-medium">Search</div>
                  <input
                    type="text"
                    name="q"
                    defaultValue={resolvedSearchParams.q ?? ""}
                    className="field"
                    placeholder="Search questions or answers"
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-2 font-medium">Audience</div>
                  <select name="audience" defaultValue={audienceFilter} className="field">
                    <option value="">All audiences</option>
                    {audiences.map((audience) => (
                      <option key={audience} value={audience}>
                        {audience}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <div className="mb-2 font-medium">Topic</div>
                  <select name="topic" defaultValue={topicFilter} className="field">
                    <option value="">All topics</option>
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col justify-end gap-3">
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="btn-primary">
                      Apply filters
                    </button>
                    <Link href="/faq" className="btn-secondary">
                      Clear
                    </Link>
                  </div>
                </div>
              </form>
            </section>

            <section className="workspace-section">
              {filteredFaqs.length === 0 ? (
                <div>
                  <h2 className="text-2xl font-semibold">No questions match those filters yet.</h2>
                  <p className="mt-3 text-sm leading-7 muted">
                    Try a broader search or clear one of the filters to see more answers.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {filteredFaqs.map((item) => (
                    <div key={item.question} className="data-row first:border-t-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                          {item.topic}
                        </span>
                        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs opacity-80">
                          {item.audience}
                        </span>
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold">{item.question}</h2>
                      <p className="mt-3 max-w-4xl text-sm leading-7 muted sm:text-base">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
