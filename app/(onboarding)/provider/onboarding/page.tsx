import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProviderOnboardingForm from "./ProviderOnboardingForm";
import { fetchProviderByUserId, getProviderVerificationMessage } from "@/lib/carebridge/providers";

export default async function ProviderOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/providers/join/apply");

  const [provider, organizations] = await Promise.all([
    fetchProviderByUserId(supabase, user.id),
    supabase.from("organizations").select("id,name").order("name", { ascending: true }),
  ]);

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
            <div className="mt-2 text-xl font-semibold capitalize">{provider?.verification_status ?? "draft"}</div>
            <p className="mt-2 text-sm leading-6 muted">{getProviderVerificationMessage(provider)}</p>
            {provider?.rejection_reason ? (
              <p className="mt-3 rounded-2xl border border-[var(--border)] bg-white/72 p-3 text-sm leading-6">
                {provider.rejection_reason}
              </p>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?next=/provider" className="btn-secondary">
              Sign in to provider workspace
            </Link>
          </div>
        </section>

        <ProviderOnboardingForm
          provider={provider}
          organizations={(organizations.data ?? []) as Array<{ id: string; name: string }>}
        />
      </div>
    </main>
  );
}
