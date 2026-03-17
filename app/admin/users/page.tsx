export default function AdminUsersPage() {
  return (
    <section className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Users</span>
      <h1 className="mt-4 text-3xl font-semibold">Role and access management foundation</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        This page is prepared for patient, provider, admin, organization owner, support staff, and moderator role workflows.
        TODO: connect role changes to RLS-safe mutations, audit logging, and support approvals before production use.
      </p>
    </section>
  );
}
