export default function PrivacyPage() {
  return (
    <main className="shell max-w-4xl space-y-6 py-8 sm:py-12">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Privacy</span>
        <h1 className="mt-4 text-4xl font-semibold">Privacy at CareBridge</h1>
        <p className="mt-4 text-sm leading-6 muted">
          CareBridge is designed to keep public content easy to browse while protecting personal healthcare workflows inside authenticated portals.
          Detailed legal and compliance review may add to this policy over time.
        </p>
        <div className="mt-6 space-y-4 text-sm leading-6 muted">
          <p>Public pages such as provider discovery, educational resources, and published recipes can be browsed without signing in.</p>
          <p>Protected areas such as appointments, messaging, forms, documents, health check-ins, and provider workspaces are limited to authorized users.</p>
          <p>For privacy questions or support requests, please contact CareBridge through the public contact page.</p>
        </div>
      </section>
    </main>
  );
}
