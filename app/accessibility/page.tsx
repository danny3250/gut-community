export default function AccessibilityPage() {
  return (
    <main className="shell max-w-4xl space-y-6 py-8 sm:py-12">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Accessibility</span>
        <h1 className="mt-4 text-4xl font-semibold">Accessibility support</h1>
        <p className="mt-4 text-sm leading-6 muted">
          CareBridge aims to keep public and portal experiences easier to navigate across desktop and mobile devices, with clear labeling, readable spacing, and structured workflows.
        </p>
        <div className="mt-6 space-y-4 text-sm leading-6 muted">
          <p>If you run into accessibility barriers while using CareBridge, please contact the team so the issue can be reviewed and improved.</p>
          <p>We continue refining navigation, forms, and content hierarchy to reduce friction for patients, providers, and administrators.</p>
        </div>
      </section>
    </main>
  );
}
