import { redirect } from "next/navigation";
import { getCurrentUserWithRole, getHomePathForRole } from "@/lib/auth/session";
import LoginForm from "@/app/components/LoginForm";
import { BRAND } from "@/lib/config/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { user, role } = await getCurrentUserWithRole();
  const resolvedSearchParams = await searchParams;

  if (user) {
    redirect(resolvedSearchParams.next || getHomePathForRole(role));
  }

  return (
    <main className="shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <span className="eyebrow">CareBridge access</span>
          <h1 className="mt-4 text-4xl font-semibold">Sign in to your account</h1>
          <p className="mt-4 text-sm leading-6 muted">
            Return to your portal, provider workspace, or admin tools to manage the next step in care.
          </p>
          <div className="mt-8 rounded-[24px] bg-[var(--warm)]/60 p-5 text-sm leading-6 muted">
            {BRAND.name} keeps care access, messaging, forms, resources, and telehealth-ready workflows connected
            so patients and providers can move faster.
          </div>
        </section>

        <section className="panel-strong px-6 py-8 sm:px-8">
          <LoginForm nextHref={resolvedSearchParams.next || "/portal"} />
        </section>
      </div>
    </main>
  );
}
