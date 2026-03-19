import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentStatusBadge from "@/app/components/AppointmentStatusBadge";
import AppointmentActionButton from "@/app/components/appointments/AppointmentActionButton";
import WorkspaceSectionHeader from "@/app/components/layout/WorkspaceSectionHeader";
import { AppointmentWithPatient, fetchAppointmentsForProvider, formatAppointmentDateTime, getAppointmentTimingState } from "@/lib/carebridge/appointments";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";
import LaunchVisitButton from "./[id]/LaunchVisitButton";

export default async function ProviderAppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/portal");

  const appointments = await fetchAppointmentsForProvider(supabase, provider.id);
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const todayAppointments = appointments.filter((appointment) => appointment.start_time.slice(0, 10) === todayKey);
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
    <main className="grid gap-7">
      <section className="section-shell">
        <span className="eyebrow">Appointments</span>
        <h1 className="mt-4 text-3xl font-semibold">See today’s schedule and manage upcoming visits.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Keep patient appointments, telehealth entry, and post-visit work together in one provider workspace.
        </p>
      </section>

      <AppointmentSection
        title="Today’s appointments"
        description="The current day’s visits that may need quick launch, confirmation, or follow-up."
        emptyTitle="No appointments scheduled for today."
        emptyBody="Your confirmed appointments will appear here as they come onto the calendar."
        appointments={todayAppointments}
      />
      <AppointmentSection
        title="Upcoming appointments"
        description="New requests and confirmed visits that are still ahead."
        emptyTitle="No upcoming appointments yet."
        emptyBody="New requests and confirmed visits will populate here automatically."
        appointments={upcoming}
      />
      <AppointmentSection
        title="Past appointments"
        description="Completed, cancelled, and no-show visits for reference."
        emptyTitle="No past appointments yet."
        emptyBody="Completed, cancelled, and no-show visits will appear here once you’ve had appointments."
        appointments={past}
      />
    </main>
  );
}

function AppointmentSection({
  title,
  description,
  emptyTitle,
  emptyBody,
  appointments,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  appointments: AppointmentWithPatient[];
}) {
  return (
    <section className="workspace-section">
      <WorkspaceSectionHeader title={title} description={description} />
      <div className="mt-5 grid gap-0">
        {appointments.length === 0 ? (
          <div className="inline-panel px-5 py-5">
            <h3 className="text-lg font-semibold">{emptyTitle}</h3>
            <p className="mt-2 text-sm leading-6 muted">{emptyBody}</p>
          </div>
        ) : (
          appointments.map((appointment) => <ProviderAppointmentRow key={appointment.id} appointment={appointment} />)
        )}
      </div>
    </section>
  );
}

function ProviderAppointmentRow({ appointment }: { appointment: AppointmentWithPatient }) {
  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] ?? null : appointment.patients ?? null;
  const timing = getAppointmentTimingState(appointment);
  const canManage = !["cancelled", "completed", "no_show"].includes(appointment.status);

  return (
    <div className="data-row first:border-t-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xl font-semibold">{patient?.legal_name || patient?.email || "Patient"}</div>
              <div className="mt-1 text-sm muted">
                {formatAppointmentDateTime(appointment)} · {appointment.appointment_type.replace(/_/g, " ")}
              </div>
            </div>
            <AppointmentStatusBadge status={appointment.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:max-w-[20rem] lg:justify-end">
          <Link href={`/provider/appointments/${appointment.id}`} className="btn-secondary px-4 py-2 text-sm">
            View details
          </Link>
          {timing.canJoin ? <LaunchVisitButton appointmentId={appointment.id} label="Launch visit" /> : null}
          {canManage ? (
            <>
              <AppointmentActionButton endpoint={`/api/appointments/${appointment.id}/status`} label="Mark confirmed" pendingLabel="Saving..." body={{ status: "confirmed" }} />
              <AppointmentActionButton endpoint={`/api/appointments/${appointment.id}/cancel`} label="Cancel" pendingLabel="Cancelling..." confirmMessage="Cancel this appointment?" />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
