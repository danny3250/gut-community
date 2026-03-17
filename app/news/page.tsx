import Link from "next/link";

const articleThemes = [
  {
    title: "Making meal decisions when your stomach feels unpredictable",
    body: "Short, practical reading that helps people think through everyday choices without turning food into a source of panic.",
  },
  {
    title: "Understanding patterns without overtracking",
    body: "Guidance for noticing what seems to help or hurt without expecting perfect data from real life.",
  },
  {
    title: "Questions worth bringing to a doctor or dietitian",
    body: "Content that helps people prepare for better conversations with professionals when symptoms need more support.",
  },
];

const editorialPromises = [
  "Readable guidance instead of recycled wellness fluff.",
  "Practical topics people can actually use in everyday life.",
  "Clear reminders about where professional care still matters.",
];

export default function NewsPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Articles and updates</span>
          <h1 className="section-title">Reading that helps when symptoms, meals, and daily routines feel confusing.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            This section is for thoughtful, practical content that helps people feel more informed and less
            alone. It should read like support, not like a content mill.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/resources" className="btn-primary">
              Browse resources
            </Link>
            <Link href="/recipes" className="btn-secondary">
              Explore recipes
            </Link>
          </div>
        </div>

        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            What this section will cover
          </div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            <li>Digestive health reading that is practical, readable, and worth returning to.</li>
            <li>Supportive articles that connect everyday food decisions with real life, not perfection.</li>
            <li>Clear reminders that education is helpful, but not a substitute for medical care.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">What this reading should feel like</h2>
          <div className="mt-4 space-y-3">
            {editorialPromises.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm leading-6 muted"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">How it fits into CareBridge</h2>
          <p className="mt-3 text-sm leading-6 muted sm:text-base">
            Articles help people understand what they are dealing with, but they are only one part of the
            experience. Recipes, resources, and the private member area are meant to work alongside this
            reading so visitors have something practical to do next.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/recipes" className="btn-secondary px-4 py-2 text-sm">
              Explore recipes
            </Link>
            <Link href="/signup" className="btn-secondary px-4 py-2 text-sm">
              Join members
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {articleThemes.map((theme) => (
          <div key={theme.title} className="panel px-6 py-6">
            <h2 className="text-2xl font-semibold">{theme.title}</h2>
            <p className="mt-3 text-sm leading-6 muted">{theme.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
