import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentStatusBadge from "@/app/components/AppointmentStatusBadge";
import { fetchPatientAppointmentById, formatAppointmentDateTime } from "@/lib/carebridge/appointments";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";

type BookingConfirmationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingConfirmationPage({ params }: BookingConfirmationPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) redirect("/portal");

  const appointment = await fetchPatientAppointmentById(supabase, patient.id, id);
  if (!appointment) notFound();

  const provider = Array.isArray(appointment.providers) ? appointment.providers[0] ?? null : appointment.providers ?? null;

  return (
    <main className="shell py-8">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Booking confirmed</span>
        <h1 className="mt-4 text-3xl font-semibold">Your appointment request is in place.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          We’ve saved the appointment details below so you can return to them whenever you need.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InfoCard label="Provider" value={provider?.display_name ?? "Provider"} />
          <InfoCard label="Date and time" value={formatAppointmentDateTime(appointment)} />
          <InfoCard label="Timezone" value={appointment.timezone} />
          <InfoCard label="Appointment type" value={appointment.appointment_type.replace(/_/g, " ")} />
          <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Status</div>
            <div className="mt-2"><AppointmentStatusBadge status={appointment.status} /></div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/portal/appointments/${appointment.id}`} className="btn-primary px-4 py-2 text-sm">
            View appointment
          </Link>
          <Link href="/portal/appointments" className="btn-secondary px-4 py-2 text-sm">
            Return to portal
          </Link>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-sm leading-6 muted capitalize">{value}</div>
    </div>
  );
}
