import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RescheduleAppointmentForm from "@/app/components/appointments/RescheduleAppointmentForm";
import { fetchPatientAppointmentById } from "@/lib/carebridge/appointments";
import { getProviderCalendar } from "@/lib/carebridge/scheduling";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";

type PortalAppointmentReschedulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PortalAppointmentReschedulePage({ params }: PortalAppointmentReschedulePageProps) {
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

  const calendar = await getProviderCalendar(
    supabase,
    appointment.provider_id,
    new Date(),
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 20)
  );
  const slots = calendar.flatMap((day) => day.openSlots);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href={`/portal/appointments/${appointment.id}`} className="text-sm muted hover:text-[var(--foreground)]">
          Back to appointment
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Reschedule appointment</h1>
        <p className="mt-3 text-sm leading-6 muted">
          Choose a new time without starting the booking process over.
        </p>
      </section>
      <RescheduleAppointmentForm appointmentId={appointment.id} slots={slots} returnHref={`/portal/appointments/${appointment.id}`} />
    </main>
  );
}
