const entries = [
  { day: "Today", feeling: "Meh", note: "Logged bloating and medium stress." },
  { day: "Yesterday", feeling: "Fine", note: "No extra context needed." },
  { day: "2 days ago", feeling: "Rough", note: "Late meal and bathroom issues logged." },
];

export default function HistoryPage() {
  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">History</span>
          <h1 className="section-title">A calm record of how things have been going</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            The history experience should stay useful even with partial data. The goal is perspective,
            not punishment for missing days.
          </p>
        </div>
        <div className="panel-strong px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Tone
          </div>
          <p className="mt-3 text-sm leading-6 muted">
            Use language like &quot;welcome back&quot; and &quot;pick up where you left off&quot; rather than streaks or
            shaming reminders.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">Recent entries</h2>
          <div className="mt-5 space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.day}
                className="rounded-[24px] border border-[var(--border)] bg-white/70 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{entry.day}</div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold">
                    {entry.feeling}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 muted">{entry.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">What this page will support</h2>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            <li>Quick scanning across recent days without needing perfect detail.</li>
            <li>Simple filters for mood, symptoms, and context categories.</li>
            <li>A bridge into analysis so users can understand what the app is noticing.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
