import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAppointmentsForProvider } from "@/lib/carebridge/appointments";
import {
  fetchProviderApplicationByUserId,
  fetchProviderByUserId,
  getProviderApplicationMessage,
  getProviderVerificationMessage,
  hasActiveProviderAccess,
  isProviderVerified,
} from "@/lib/carebridge/providers";

export default async function ProviderDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [provider, application] = await Promise.all([
    fetchProviderByUserId(supabase, user.id),
    fetchProviderApplicationByUserId(supabase, user.id),
  ]);

  if (!provider && !application) redirect("/providers/join/apply");

  const isVerified = isProviderVerified(provider);
  const hasActiveAccess = hasActiveProviderAccess(provider);
  const appointments = provider && isVerified ? await fetchAppointmentsForProvider(supabase, provider.id) : [];
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const todaysAppointments = appointments.filter((appointment) => appointment.start_time.slice(0, 10) === todayKey);
  const upcomingAppointments = appointments.filter(
    (appointment) => !["completed", "cancelled", "no_show"].includes(appointment.status) && new Date(appointment.end_time) >= now
  );

  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Provider dashboard</span>
          <h1 className="section-title">
            {isVerified
              ? "Your verified CareBridge workspace is ready."
              : application?.status === "rejected"
                ? "Your provider application needs an update before approval."
                : provider?.verification_status === "suspended"
                  ? "Your provider access is currently suspended."
                  : "Your provider application is still moving through review."}
          </h1>
          <p className="max-w-2xl text-base leading-7 muted">
            {provider ? getProviderVerificationMessage(provider) : getProviderApplicationMessage(application)}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/provider/onboarding" className="btn-primary">
              {provider?.verification_status === "verified"
                ? "Review provider profile"
                : application?.status === "rejected"
                  ? "Update application"
                  : "Review application"}
            </Link>
            {isVerified ? (
              <>
                <Link href="/provider/schedule" className="btn-secondary">
                  Open schedule
                </Link>
                <Link href="/provider/patients" className="btn-secondary">
                  Review patients
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-5 py-5 sm:grid-cols-2">
          <MiniCard title="Application status" body={provider?.verification_status ?? application?.status ?? "draft"} />
          <MiniCard title="Accepting patients" body={provider?.is_accepting_patients ? "Yes" : "Not active yet"} />
          <MiniCard title="Today's appointments" body={isVerified ? String(todaysAppointments.length) : "Bookings activate after verification"} />
          <MiniCard title="Provider access" body={hasActiveAccess ? provider?.verification_status ?? "active" : "Application only"} />
        </div>
      </section>

      {isVerified ? (
        <section className="grid gap-4 xl:grid-cols-4">
          <QuickLink href="/provider/appointments" title="Appointments" body="Review today's schedule and upcoming telehealth visits." />
          <QuickLink href="/provider/schedule" title="Schedule" body="Manage availability windows, blocked time, and working hours." />
          <QuickLink href="/provider/patients" title="Patient insights" body="Open recent health check-ins, symptom trends, and visit context." />
          <QuickLink href="/provider/community" title="Community" body="Answer questions with verified provider responses when appropriate." />
        </section>
      ) : (
        <section className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">What happens next</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniCard
              title={application?.status === "rejected" ? "Needs revision" : provider?.verification_status === "suspended" ? "Suspended" : "Under review"}
              body={
                application?.status === "rejected"
                  ? "Review the notes on your application, update your information, and resubmit when ready."
                  : provider?.verification_status === "suspended"
                    ? "Your provider record remains on file, but public visibility and bookings are paused."
                    : "Your submitted application is being checked before it becomes publicly visible."
              }
            />
            <MiniCard title="Bookings paused" body="Patients cannot book or launch telehealth until provider access is active." />
            <MiniCard title="Provider actions limited" body="Verified community responses and public discovery stay disabled until approval." />
          </div>
        </section>
      )}
    </>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/55 px-4 py-4">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-2 text-sm leading-6 muted capitalize">{body}</div>
    </div>
  );
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="panel block px-5 py-5 hover:-translate-y-0.5">
      <div className="text-xl font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
    </Link>
  );
}
