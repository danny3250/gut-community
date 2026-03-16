import Link from "next/link";

export default function AppSettingsPage() {
  return (
    <>
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Settings</span>
        <h1 className="mt-4 text-4xl font-semibold">Settings and preferences</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 muted">
          Keep settings lightweight and practical: account details, notification preferences, and a clear
          place for future app-specific controls.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Link href="/settings/profile" className="panel block px-5 py-5 hover:-translate-y-0.5">
          <div className="text-xl font-semibold">Profile</div>
          <p className="mt-2 text-sm leading-6 muted">
            Manage display name, visible identity, and role-aware account details.
          </p>
        </Link>

        <div className="panel px-5 py-5">
          <div className="text-xl font-semibold">Notifications</div>
          <p className="mt-2 text-sm leading-6 muted">
            Prepare a simple, non-spammy notification area for daily reminders and product updates.
          </p>
          <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm muted">
            Suggested approach: gentle daily reminder preferences, no guilt language, easy opt-out.
          </div>
        </div>

        <div className="panel px-5 py-5">
          <div className="text-xl font-semibold">App preferences</div>
          <p className="mt-2 text-sm leading-6 muted">
            Reserve space for future toggles like symptom categories, digestibility preferences, or data
            export options.
          </p>
        </div>
      </section>
    </>
  );
}
