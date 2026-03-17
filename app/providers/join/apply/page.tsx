import Link from "next/link";
import { redirect } from "next/navigation";
import SignupForm from "@/app/components/SignupForm";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";

export default async function ProviderApplyPage() {
  const { supabase, user, role } = await getCurrentUserWithRole();

  if (user) {
    const provider = await fetchProviderByUserId(supabase, user.id);

    if (provider) {
      redirect("/provider/onboarding");
    }
  }

  return (
    <main className="shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <span className="eyebrow">Provider application</span>
          <h1 className="mt-4 text-4xl font-semibold">
            {user ? "Continue into provider onboarding intentionally." : "Start your CareBridge provider application."}
          </h1>
          <p className="mt-4 text-sm leading-6 muted">
            Providers enter CareBridge through a reviewed application path. This keeps directory visibility, bookings,
            telehealth access, and verified provider features aligned with credential review.
          </p>

          {user ? (
            <div className="mt-8 rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <div className="text-sm font-semibold">Signed in as {user.email}</div>
              <p className="mt-3 text-sm leading-6 muted">
                Starting a provider application does not automatically convert your existing account or activate provider access.
                You will continue into a separate reviewed onboarding flow.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/provider/onboarding" className="btn-primary">
                  Continue to provider onboarding
                </Link>
                <Link href={role === "provider" ? "/provider" : "/portal"} className="btn-secondary">
                  Return to workspace
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-3 text-sm leading-6 muted">
              <p>Applications are reviewed before public listing and patient booking go live.</p>
              <p>Have an existing provider applicant account? Sign in from the form to continue where you left off.</p>
            </div>
          )}
        </section>

        <section className="panel-strong px-6 py-8 sm:px-8">
          {user ? (
            <div className="space-y-4">
              <div className="text-xl font-semibold">Ready for the next step</div>
              <p className="text-sm leading-6 muted">
                Continue into onboarding to submit your credentials, specialty, licensing details, telehealth availability,
                and organization information for review.
              </p>
            </div>
          ) : (
            <SignupForm nextHref="/provider/onboarding" role="provider" />
          )}
        </section>
      </div>
    </main>
  );
}
