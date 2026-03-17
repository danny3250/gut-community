import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppointmentStatusBadge from "@/app/components/AppointmentStatusBadge";
import AppointmentActionButton from "@/app/components/appointments/AppointmentActionButton";
import {
  AppointmentWithProvider,
  fetchAppointmentsForPatient,
  formatAppointmentDateTime,
  getAppointmentTimingState,
} from "@/lib/carebridge/appointments";
import { getOrCreatePatientRecord } from "@/lib/carebridge/patients";
import JoinVisitButton from "./JoinVisitButton";

type PortalAppointmentsPageProps = {
  searchParams: Promise<{ booked?: string }>;
};

export default async function PortalAppointmentsPage({ searchParams }: PortalAppointmentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const patientId = await getOrCreatePatientRecord(supabase, user);
  const appointments = await fetchAppointmentsForPatient(supabase, patientId);
  const now = new Date();

  const upcoming = appointments.filter(
    (appointment) =>
      !["completed", "cancelled", "no_show"].includes(appointment.status) &&
      new Date(appointment.end_time) >= now
  );
  const past = appointments.filter(
    (appointment) =>
      ["completed", "cancelled", "no_show"].includes(appointment.status) ||
      new Date(appointment.end_time) < now
  );

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Appointments</span>
        <h1 className="mt-4 text-3xl font-semibold">Keep your upcoming care and visit details in one place.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Review scheduled appointments, open telehealth visits when they become available, and manage changes without leaving the portal.
        </p>
        {resolvedSearchParams.booked === "1" ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">
            Your appointment request has been submitted. You can track the status below.
          </div>
        ) : null}
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Upcoming appointments</h2>
          <Link href="/providers" className="btn-secondary px-4 py-2 text-sm">
            Browse providers
          </Link>
        </div>
        <div className="mt-5 grid gap-4">
          {upcoming.length === 0 ? (
            <EmptyState
              title="You don’t have any upcoming appointments yet."
              body="When you’re ready, browse the provider directory to book your first visit."
              href="/providers"
              cta="Book an appointment"
            />
          ) : (
            upcoming.map((appointment) => <PatientAppointmentCard key={appointment.id} appointment={appointment} />)
          )}
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Past appointments</h2>
        <div className="mt-5 grid gap-4">
          {past.length === 0 ? (
            <EmptyState
              title="Past appointments will appear here."
              body="Completed and cancelled visits will show up once you’ve had an appointment."
            />
          ) : (
            past.map((appointment) => <PatientAppointmentCard key={appointment.id} appointment={appointment} />)
          )}
        </div>
      </section>
    </main>
  );
}

function PatientAppointmentCard({ appointment }: { appointment: AppointmentWithProvider }) {
  const provider = Array.isArray(appointment.providers) ? appointment.providers[0] ?? null : appointment.providers ?? null;
  const organization = provider?.organizations;
  const organizationName = Array.isArray(organization) ? organization[0]?.name : organization?.name;
  const timing = getAppointmentTimingState(appointment);
  const isUpcoming = !["completed", "cancelled", "no_show"].includes(appointment.status) && new Date(appointment.end_time) >= new Date();

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xl font-semibold">{provider?.display_name ?? "Provider"}</div>
          <div className="mt-1 text-sm muted">
            {[provider?.credentials, provider?.specialty].filter(Boolean).join(" · ")}
          </div>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 muted sm:grid-cols-4">
        <Info label="Date and time" value={formatAppointmentDateTime(appointment)} />
        <Info label="Timezone" value={appointment.timezone} />
        <Info label="Appointment type" value={appointment.appointment_type.replace(/_/g, " ")} />
        <Info label="Organization" value={organizationName ?? "Independent provider"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/portal/appointments/${appointment.id}`} className="btn-secondary px-4 py-2 text-sm">
          View details
        </Link>
        {isUpcoming ? (
          <>
            <Link href={`/portal/appointments/${appointment.id}/reschedule`} className="btn-secondary px-4 py-2 text-sm">
              Reschedule
            </Link>
            <AppointmentActionButton
              endpoint={`/api/appointments/${appointment.id}/cancel`}
              label="Cancel"
              pendingLabel="Cancelling..."
              confirmMessage="Cancel this appointment?"
            />
            {timing.canJoin ? <JoinVisitButton appointmentId={appointment.id} label="Join visit" /> : (
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-2 text-sm muted">
                {timing.label}
              </div>
            )}
          </>
        ) : provider?.slug ? (
          <Link href={`/providers/${provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
            Book again
          </Link>
        ) : null}
      </div>

      {timing.helperText ? <p className="mt-3 text-sm leading-6 muted">{timing.helperText}</p> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-medium text-[var(--foreground)]">{label}</div>
      <div className="capitalize">{value}</div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
      {href && cta ? (
        <div className="mt-4">
          <Link href={href} className="btn-secondary px-4 py-2 text-sm">
            {cta}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
