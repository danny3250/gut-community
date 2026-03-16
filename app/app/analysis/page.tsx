const insights = [
  {
    title: "Stress may be worth testing",
    body: "On tougher days, stress is showing up often enough that it may be contributing to symptom severity.",
    why: "Three recent rougher days included medium or high stress context.",
  },
  {
    title: "Late meals look like a possible factor",
    body: "Late eating appears worth testing gently rather than assuming it is always a problem.",
    why: "Recent entries with late meals coincided with more Meh or Rough days.",
  },
  {
    title: "Gentle-food days seem steadier",
    body: "When you log gentler meals, your check-ins look more stable overall.",
    why: "Fine days have clustered more often with gentle-food context selections.",
  },
];

export default function AnalysisPage() {
  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Analysis</span>
          <h1 className="section-title">Explainable insight, not diagnosis</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            This page is designed to summarize patterns with safe, probabilistic language and explain why
            the app is surfacing them. The app should never act like a doctor.
          </p>
        </div>
        <div className="panel-strong px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Guardrails
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 muted">
            <li>Highlight patterns and gentle correlations only.</li>
            <li>Suggest low-risk experiments instead of treatment advice.</li>
            <li>Reserve LLMs for explanation, never the core reasoning engine.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {insights.map((insight) => (
          <article key={insight.title} className="panel px-5 py-5">
            <h2 className="text-xl font-semibold">{insight.title}</h2>
            <p className="mt-3 text-sm leading-6 muted">{insight.body}</p>
            <div className="mt-4 rounded-[22px] bg-[var(--accent-soft)]/45 px-4 py-4 text-sm leading-6">
              <div className="font-semibold text-[var(--accent-strong)]">Why this is showing up</div>
              <p className="mt-1 muted">{insight.why}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
