import { redirect } from "next/navigation";
import { getCurrentUserWithRole, getHomePathForRole } from "@/lib/auth/session";
import SignupForm from "@/app/components/SignupForm";
import { BRAND } from "@/lib/config/brand";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const { user, role } = await getCurrentUserWithRole();
  const resolvedSearchParams = await searchParams;
  const requestedRole = resolvedSearchParams.role === "provider" ? "provider" : "patient";
  const defaultNextHref = requestedRole === "provider" ? "/provider/onboarding" : "/portal";

  if (user) {
    redirect(resolvedSearchParams.next || getHomePathForRole(role));
  }

  return (
    <main className="shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <span className="eyebrow">Create account</span>
          <h1 className="mt-4 text-4xl font-semibold">
            {requestedRole === "provider" ? `Create your ${BRAND.name} provider account` : `Create your ${BRAND.name} account`}
          </h1>
          <p className="mt-4 text-sm leading-6 muted">
            {requestedRole === "provider"
              ? "Create your account to complete provider onboarding, submit your credentials for review, and unlock public listing only after verification."
              : "Create an account to access the patient portal, save helpful resources, prepare for appointments, and stay connected to care over time."}
          </p>
          <div className="mt-8 space-y-3 text-sm leading-6 muted">
            <p>Public resources stay open, while protected patient, provider, and admin workflows stay role-gated.</p>
            <p>
              {requestedRole === "provider"
                ? "After you sign up, you will verify your email and continue into provider onboarding before your profile can become publicly active."
                : "After you sign up, you&apos;ll verify your email and then continue into the right CareBridge workspace."}
            </p>
          </div>
        </section>

        <section className="panel-strong px-6 py-8 sm:px-8">
          <SignupForm nextHref={resolvedSearchParams.next || defaultNextHref} role={requestedRole} />
        </section>
      </div>
    </main>
  );
}
