export default function AdminDashboardPage() {
  return (
    <section className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Admin overview</span>
      <h1 className="mt-4 text-3xl font-semibold">Organization, access, and workflow oversight</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        CareBridge admin workflows are designed to support role management, organization setup, content operations,
        moderation, and audit visibility without exposing protected health workflows publicly.
      </p>
    </section>
  );
}
