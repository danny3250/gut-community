import Link from "next/link";

export default function ProviderSettingsPage() {
  return (
    <div className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Settings</span>
        <h1 className="mt-4 text-3xl font-semibold">Provider profile, licensing, and scheduling settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Keep your provider metadata, licensed states, organization setup, and recurring availability in sync.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Availability settings</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Edit weekly working hours and slot duration defaults for patient booking.
          </p>
          <div className="mt-5">
            <Link href="/provider/settings/availability" className="btn-primary px-4 py-2 text-sm">
              Manage availability
            </Link>
          </div>
        </article>

        <article className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Provider metadata</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Credentials, states served, telehealth enablement, and organization ties will continue to live here.
          </p>
        </article>
      </section>
    </div>
  );
}
