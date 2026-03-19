import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProviderOnboardingForm from "./ProviderOnboardingForm";
import {
  CONDITION_FOCUS_TAXONOMY,
  PROVIDER_SPECIALTY_TAXONOMY,
} from "@/lib/carebridge/taxonomy";
import {
  fetchProviderApplicationByUserId,
  fetchProviderByUserId,
  fetchProviderScopeOptions,
  getProviderApplicationMessage,
  getProviderVerificationMessage,
} from "@/lib/carebridge/providers";

export default async function ProviderOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/providers/join/apply");

  const [provider, application, organizations, scopeOptions] = await Promise.all([
    fetchProviderByUserId(supabase, user.id),
    fetchProviderApplicationByUserId(supabase, user.id),
    supabase.from("organizations").select("id,name").order("name", { ascending: true }),
    fetchProviderScopeOptions(supabase),
  ]);

  const statusLabel = provider?.verification_status ?? application?.status ?? "draft";
  const statusMessage = provider ? getProviderVerificationMessage(provider) : getProviderApplicationMessage(application);

  return (
    <main className="shell py-8 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <span className="eyebrow">Provider verification</span>
          <h1 className="mt-4 text-4xl font-semibold">Build the provider profile patients will eventually see.</h1>
          <p className="mt-4 text-sm leading-6 muted">
            CareBridge uses staged onboarding so real providers can be reviewed before public listing, booking access, and verified provider actions go live.
          </p>
          <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Current status
            </div>
            <div className="mt-2 text-xl font-semibold capitalize">{statusLabel}</div>
            <p className="mt-2 text-sm leading-6 muted">{statusMessage}</p>
            {(application?.rejection_reason || provider?.rejection_reason) ? (
              <p className="mt-3 rounded-2xl border border-[var(--border)] bg-white/72 p-3 text-sm leading-6">
                {application?.rejection_reason ?? provider?.rejection_reason}
              </p>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/provider" className="btn-secondary">
              Open provider status page
            </Link>
          </div>
        </section>

        <ProviderOnboardingForm
          application={application}
          provider={provider}
          organizations={(organizations.data ?? []) as Array<{ id: string; name: string }>}
          specialties={
            scopeOptions.specialties.length > 0
              ? scopeOptions.specialties
              : PROVIDER_SPECIALTY_TAXONOMY.map((item) => ({ ...item, id: item.slug }))
          }
          conditions={
            scopeOptions.conditions.length > 0
              ? scopeOptions.conditions
              : CONDITION_FOCUS_TAXONOMY.map((item) => ({ ...item, id: item.slug }))
          }
        />
      </div>
    </main>
  );
}
