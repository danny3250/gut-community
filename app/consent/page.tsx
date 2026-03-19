import { redirect } from "next/navigation";
import { getCurrentUserWithRole, getHomePathForRole } from "@/lib/auth/session";
import PolicyConsentForm from "@/app/components/PolicyConsentForm";
import { hasCurrentRequiredPolicyAcceptance } from "@/lib/carebridge/policy-acceptance";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { user, role } = await getCurrentUserWithRole();
  const resolvedSearchParams = await searchParams;
  const nextHref = resolvedSearchParams.next || getHomePathForRole(role);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextHref)}`);
  }

  if (hasCurrentRequiredPolicyAcceptance(user)) {
    redirect(nextHref);
  }

  return (
    <main className="shell py-8 sm:py-12">
      <section className="panel mx-auto max-w-3xl px-6 py-8 sm:px-8">
        <span className="eyebrow">Policy acceptance required</span>
        <h1 className="mt-4 text-4xl font-semibold">Review and accept the current CareBridge policies to continue.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 muted">
          We updated the legal and privacy language used across CareBridge. Before you return to your workspace,
          please confirm that you agree to the Terms & Conditions and acknowledge the Privacy Policy.
        </p>
        <div className="mt-8">
          <PolicyConsentForm nextHref={nextHref} />
        </div>
      </section>
    </main>
  );
}
