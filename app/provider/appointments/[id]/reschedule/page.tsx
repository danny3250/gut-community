import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RescheduleAppointmentForm from "@/app/components/appointments/RescheduleAppointmentForm";
import { fetchProviderAppointmentById } from "@/lib/carebridge/appointments";
import { getProviderCalendar } from "@/lib/carebridge/scheduling";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";

type ProviderAppointmentReschedulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProviderAppointmentReschedulePage({
  params,
}: ProviderAppointmentReschedulePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/portal");

  const appointment = await fetchProviderAppointmentById(supabase, provider.id, id);
  if (!appointment) notFound();

  const calendar = await getProviderCalendar(
    supabase,
    provider.id,
    new Date(),
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 20)
  );
  const slots = calendar.flatMap((day) => day.openSlots);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href={`/provider/appointments/${appointment.id}`} className="text-sm muted hover:text-[var(--foreground)]">
          Back to appointment
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Reschedule appointment</h1>
        <p className="mt-3 text-sm leading-6 muted">
          Choose a new time from your current availability and confirmed schedule.
        </p>
      </section>
      <RescheduleAppointmentForm appointmentId={appointment.id} slots={slots} returnHref={`/provider/appointments/${appointment.id}`} />
    </main>
  );
}
