import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import { getProviderCalendar } from "@/lib/carebridge/scheduling";
import {
  canProviderAcceptBookings,
  fetchProviderAvailability,
  fetchProviderBySlug,
  isProviderVerified,
} from "@/lib/carebridge/providers";
import BookingPanel from "../BookingPanel";

type ProviderProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProviderProfilePage({ params }: ProviderProfilePageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const provider = await fetchProviderBySlug(supabase, slug);

  if (!provider) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patient = user ? await fetchPatientByUserId(supabase, user.id) : null;
  const isPatientStateEligible = !patient?.state || provider.states_served.includes(patient.state);
  const isBookableProvider = canProviderAcceptBookings(provider);
  const canBook = Boolean(user) && isBookableProvider && isPatientStateEligible;
  const eligibilityMessage = !isProviderVerified(provider)
    ? "This provider is not currently available for booking."
    : !provider.is_accepting_patients
      ? "This provider is not accepting new patients right now."
      : patient?.state && !isPatientStateEligible
        ? "This provider is not currently licensed to provide telehealth visits in your state."
        : null;

  const [availability, calendarDays] = await Promise.all([
    fetchProviderAvailability(supabase, provider.id),
    getProviderCalendar(
      supabase,
      provider.id,
      new Date(),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
      { publicView: true }
    ),
  ]);

  const slots = calendarDays.flatMap((day) => day.openSlots).slice(0, 24);

  const visitTypes = provider.visit_types && provider.visit_types.length > 0
    ? provider.visit_types
    : ["telehealth", "consultation", "follow_up"];

  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <Link href="/providers" className="text-sm muted hover:text-[var(--foreground)]">
        Back to providers
      </Link>

      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Provider profile</span>
          <div>
            <h1 className="text-4xl font-semibold">{provider.display_name}</h1>
            <p className="mt-2 text-base leading-7 muted">
              {[provider.credentials, provider.specialty].filter(Boolean).join(" | ")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-[var(--border)] px-3 py-1 opacity-80">
              {provider.telehealth_enabled ? "Telehealth available" : "Telehealth details coming soon"}
            </span>
            {provider.states_served.map((state) => (
              <span key={state} className="rounded-full border border-[var(--border)] px-3 py-1 opacity-80">
                {state}
              </span>
            ))}
          </div>

          {provider.organization?.name ? (
            <p className="text-sm leading-6 muted">Organization: {provider.organization.name}</p>
          ) : null}

          {provider.bio ? <p className="max-w-3xl text-sm leading-7 muted sm:text-base">{provider.bio}</p> : null}
        </div>

        <BookingPanel
          providerId={provider.id}
          providerSlug={provider.slug}
          organizationId={provider.organization_id}
          visitTypes={visitTypes}
          slots={slots}
          isAuthenticated={Boolean(user)}
          canBook={canBook}
          eligibilityMessage={eligibilityMessage}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Areas of care</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(provider.areas_of_care && provider.areas_of_care.length > 0 ? provider.areas_of_care : [provider.specialty ?? "General care"]).map((item) => (
              <span
                key={item}
                className="rounded-full bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Supported visit types</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {visitTypes.map((type) => (
              <span key={type} className="rounded-full border border-[var(--border)] px-3 py-2 text-sm opacity-80">
                {type.split("_").join(" ")}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 muted">
            Appointment requests created here will later connect to a telehealth session workflow through the
            CareBridge visit adapter layer.
          </p>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Availability snapshot</h2>
        <p className="mt-3 text-sm leading-6 muted">
          Available time slots are generated from provider availability windows and filtered against requested
          and confirmed appointments.
        </p>
      </section>
    </main>
  );
}
