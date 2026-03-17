import Link from "next/link";

export default function CommunityPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Community</span>
          <h1 className="section-title">Supportive discussion, moderated participation, and future provider-guided spaces.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            Community remains part of CareBridge through patient discussion and future provider-authored guidance,
            while staying clearly separate from formal clinical workflows.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/forum" className="btn-primary">Open discussions</Link>
            <Link href="/signup" className="btn-secondary">Join CareBridge</Link>
          </div>
        </div>
        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Community principles</div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            <li>Moderated patient support and discussion</li>
            <li>Clear boundaries around medical advice and clinical care</li>
            <li>Future topic and condition tagging for better organization</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
