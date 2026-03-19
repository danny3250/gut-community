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
import { getProviderPatients } from "@/lib/carebridge/relationships";

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
  const [appointments, relatedPatients] = provider && isVerified
    ? await Promise.all([
        fetchAppointmentsForProvider(supabase, provider.id),
        getProviderPatients(supabase, provider.id, 4),
      ])
    : [[], []];
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const todaysAppointments = appointments.filter((appointment) => appointment.start_time.slice(0, 10) === todayKey);
  const upcomingAppointments = appointments.filter(
    (appointment) => !["completed", "cancelled", "no_show"].includes(appointment.status) && new Date(appointment.end_time) >= now
  );

  return (
    <>
      <section className="section-shell grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
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

        <div className="grid gap-3 sm:grid-cols-2">
          <MiniCard title="Application status" body={provider?.verification_status ?? application?.status ?? "draft"} />
          <MiniCard title="Accepting patients" body={provider?.is_accepting_patients ? "Yes" : "Not active yet"} />
          <MiniCard title="Today's appointments" body={isVerified ? String(todaysAppointments.length) : "Bookings activate after verification"} />
          <MiniCard title="Provider access" body={hasActiveAccess ? provider?.verification_status ?? "active" : "Application only"} />
          <MiniCard title="Active patients" body={isVerified ? String(relatedPatients.filter((relationship) => relationship.status !== "past").length) : "Available after approval"} />
        </div>
      </section>

      {isVerified ? (
        <>
          <section className="workspace-section">
            <div className="text-2xl font-semibold">Provider tools</div>
            <p className="mt-2 text-sm leading-6 muted">Move between schedule management, patient context, and community work from one quieter workspace.</p>
          </section>
          <section className="grid gap-3 xl:grid-cols-4">
            <QuickLink href="/provider/appointments" title="Appointments" body="Review today's schedule and upcoming telehealth visits." />
            <QuickLink href="/provider/schedule" title="Schedule" body="Manage availability windows, blocked time, and working hours." />
            <QuickLink href="/provider/patients" title="Patient insights" body="Open recent health check-ins, symptom trends, and visit context." />
            <QuickLink href="/provider/community" title="Community" body="Answer questions with verified provider responses when appropriate." />
          </section>

          <section className="workspace-section">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="eyebrow">Recent patients</span>
                <h2 className="mt-3 text-2xl font-semibold">Continuity is easier to manage when recent patients stay visible.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 muted">
                  This list reflects patient-provider relationships created through booked and completed appointments.
                </p>
              </div>
              <Link href="/provider/patients" className="btn-secondary">
                Open patient list
              </Link>
            </div>

            {relatedPatients.length === 0 ? (
              <div className="mt-5 inline-panel px-5 py-5">
                <h3 className="text-lg font-semibold">No patient relationships yet.</h3>
                <p className="mt-2 text-sm leading-6 muted">
                  Patients will appear here after a booking is created so follow-up and rebooking are easier to track.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                {relatedPatients.map((relationship) => (
                  <Link
                    key={relationship.id}
                    href={relationship.patient ? `/provider/patients/${relationship.patient.id}` : "/provider/patients"}
                    className="inline-panel px-5 py-4 hover:-translate-y-0.5"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {formatRelationshipStatus(relationship.status)}
                    </div>
                    <div className="mt-3 text-xl font-semibold">
                      {relationship.patient?.legal_name || relationship.patient?.email || "Patient"}
                    </div>
                    {relationship.last_appointment_at ? (
                      <p className="mt-2 text-sm leading-6 muted">
                        Last appointment {formatShortDate(relationship.last_appointment_at)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-6 muted">
                      {relationship.is_primary ? "Primary provider relationship" : relationship.is_favorite ? "Favorited by patient" : "Care relationship on file"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="workspace-section">
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

function formatRelationshipStatus(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "past":
      return "Past";
    default:
      return "Booked";
  }
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="metric-tile">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-2 text-sm leading-6 muted capitalize">{body}</div>
    </div>
  );
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="inline-panel block px-5 py-4 hover:-translate-y-0.5">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
    </Link>
  );
}
