import Link from "next/link";

export default function AppAdminPage() {
  return (
    <section className="panel space-y-4 px-6 py-8 sm:px-8">
      <span className="eyebrow">Admin area</span>
      <h1 className="text-4xl font-semibold">Admin surface</h1>
      <p className="max-w-2xl text-base leading-7 muted">
        This gives the private app a clean place for future moderation, user management, and internal tools.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/users" className="btn-primary">
          Open user management
        </Link>
        <Link href="/app" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
