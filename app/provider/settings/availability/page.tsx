import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AvailabilitySettingsManager from "./AvailabilitySettingsManager";
import { fetchProviderAvailability, fetchProviderByUserId, isProviderVerified } from "@/lib/carebridge/providers";

export default async function ProviderAvailabilitySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/provider");
  if (!isProviderVerified(provider)) redirect("/provider");

  const availability = await fetchProviderAvailability(supabase, provider.id);

  return (
    <div className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow">Settings</span>
            <h1 className="mt-4 text-3xl font-semibold">Availability settings</h1>
            <p className="mt-3 text-sm leading-6 muted">
              Maintain your recurring weekly hours here. These windows feed the patient booking flow and your
              provider schedule.
            </p>
          </div>
          <Link href="/provider/schedule" className="btn-secondary px-4 py-2 text-sm">
            Back to schedule
          </Link>
        </div>
      </section>

      <AvailabilitySettingsManager providerId={provider.id} initialAvailability={availability} />
    </div>
  );
}
