import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="shell max-w-4xl space-y-6 py-8 sm:py-12">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Help</span>
        <h1 className="mt-4 text-4xl font-semibold">How to get help with CareBridge</h1>
        <p className="mt-4 text-sm leading-6 muted">
          Use CareBridge support channels when you need help with access, portal navigation, provider applications, or general platform questions.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
            <div className="text-lg font-semibold">Patient support</div>
            <p className="mt-3 text-sm leading-6 muted">
              For questions about appointments, portal access, or where to find information, start with the FAQ or contact page.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
            <div className="text-lg font-semibold">Provider support</div>
            <p className="mt-3 text-sm leading-6 muted">
              Providers can begin from the public join page, continue their reviewed application, or contact CareBridge with onboarding questions.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/faq" className="btn-secondary">
            Open FAQ
          </Link>
          <Link href="/contact" className="btn-primary">
            Contact CareBridge
          </Link>
          <Link href="/providers/join" className="btn-secondary">
            Provider entry
          </Link>
        </div>
      </section>
    </main>
  );
}
