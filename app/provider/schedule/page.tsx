import { redirect } from "next/navigation";
import ProviderScheduleManager, { ProviderScheduleManagerProps } from "./ProviderScheduleManager";
import { createClient } from "@/lib/supabase/server";
import { fetchAppointmentsForProvider } from "@/lib/carebridge/appointments";
import { fetchProviderTimeBlocks, getProviderCalendar } from "@/lib/carebridge/scheduling";
import { fetchProviderAvailability, fetchProviderByUserId } from "@/lib/carebridge/providers";

export default async function ProviderSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) {
    return (
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Schedule</span>
        <h1 className="mt-4 text-3xl font-semibold">Provider profile needed</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          A provider record needs to exist before schedule management can be used.
        </p>
      </section>
    );
  }

  const start = new Date();
  const end = new Date(Date.now() + 1000 * 60 * 60 * 24 * 6);

  const [availability, appointments, timeBlocks, calendarDays] = await Promise.all([
    fetchProviderAvailability(supabase, provider.id),
    fetchAppointmentsForProvider(supabase, provider.id, new Date().toISOString()),
    fetchProviderTimeBlocks(supabase, provider.id, new Date().toISOString(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()),
    getProviderCalendar(supabase, provider.id, start, end),
  ]);

  return (
    <ProviderScheduleManager
      providerId={provider.id}
      initialAvailability={availability}
      initialAppointments={appointments as ProviderScheduleManagerProps["initialAppointments"]}
      initialTimeBlocks={timeBlocks}
      initialCalendarDays={calendarDays}
    />
  );
}
