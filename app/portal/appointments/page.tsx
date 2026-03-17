import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAppointmentsForPatient } from "@/lib/carebridge/appointments";
import { getOrCreatePatientRecord } from "@/lib/carebridge/patients";
import JoinVisitButton from "./JoinVisitButton";

type PortalAppointmentsPageProps = {
  searchParams: Promise<{ booked?: string }>;
};

type AppointmentWithProvider = {
  id: string;
  status: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  timezone: string;
  join_url_placeholder: string | null;
  providers?: {
    display_name: string | null;
    credentials: string | null;
    specialty: string | null;
  } | {
    display_name: string | null;
    credentials: string | null;
    specialty: string | null;
  }[] | null;
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
  const appointments = (await fetchAppointmentsForPatient(supabase, patientId)) as AppointmentWithProvider[];

  const upcoming = appointments.filter(
    (appointment) =>
      appointment.status !== "completed" &&
      appointment.status !== "cancelled" &&
      new Date(appointment.end_time) >= new Date()
  );
  const past = appointments.filter(
    (appointment) =>
      appointment.status === "completed" ||
      appointment.status === "cancelled" ||
      new Date(appointment.end_time) < new Date()
  );

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Appointments</span>
        <h1 className="mt-4 text-3xl font-semibold">Upcoming, past, and requested visits</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Review upcoming care, track appointment status, and use future telehealth launch links from this one place.
        </p>
        {resolvedSearchParams.booked === "1" ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">
            Appointment request submitted. A provider can now confirm or update the visit status.
          </div>
        ) : null}
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Upcoming appointments</h2>
          <Link href="/providers" className="btn-secondary px-4 py-2 text-sm">
            Book another visit
          </Link>
        </div>
        <div className="mt-5 grid gap-3">
          {upcoming.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
              No upcoming appointments yet.
            </div>
          ) : (
            upcoming.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Past and completed appointments</h2>
        <div className="mt-5 grid gap-3">
          {past.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
              Past appointments will appear here.
            </div>
          ) : (
            past.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function AppointmentCard({ appointment }: { appointment: AppointmentWithProvider }) {
  const provider = Array.isArray(appointment.providers) ? appointment.providers[0] : appointment.providers;
  const isTelehealth = appointment.appointment_type === "telehealth";

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xl font-semibold">{provider?.display_name ?? "Provider"}</div>
          <div className="mt-1 text-sm muted">
            {[provider?.credentials, provider?.specialty].filter(Boolean).join(" · ")}
          </div>
        </div>
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold">
          {appointment.status}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm leading-6 muted sm:grid-cols-3">
        <div>
          <div className="font-medium text-[var(--foreground)]">Visit time</div>
          <div>
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: appointment.timezone,
            }).format(new Date(appointment.start_time))}
          </div>
        </div>
        <div>
          <div className="font-medium text-[var(--foreground)]">Appointment type</div>
          <div>{appointment.appointment_type.replace("_", " ")}</div>
        </div>
        <div>
          <div className="font-medium text-[var(--foreground)]">Telehealth</div>
          <div>{isTelehealth ? "Join link will appear here later" : "Not a telehealth visit"}</div>
        </div>
      </div>

      {isTelehealth && appointment.join_url_placeholder ? (
        <JoinVisitButton appointmentId={appointment.id} />
      ) : isTelehealth ? (
        <JoinVisitButton appointmentId={appointment.id} />
      ) : null}
    </div>
  );
}
