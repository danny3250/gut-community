export default function TermsPage() {
  return (
    <main className="shell max-w-4xl space-y-6 py-8 sm:py-12">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Terms</span>
        <h1 className="mt-4 text-4xl font-semibold">CareBridge terms of use</h1>
        <p className="mt-4 text-sm leading-6 muted">
          CareBridge offers public discovery and secure healthcare workflow tools. Public information is not a substitute for personalized medical advice, diagnosis, or treatment.
        </p>
        <div className="mt-6 space-y-4 text-sm leading-6 muted">
          <p>Users are responsible for maintaining accurate account information and protecting access to their secure workspaces.</p>
          <p>Provider features remain gated until verification is completed and may be limited, paused, or removed during review or compliance actions.</p>
          <p>Additional legal language may be added as CareBridge expands. For current support, use the public contact channels.</p>
        </div>
      </section>
    </main>
  );
}
