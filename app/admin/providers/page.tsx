import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";

type ProviderAdminRow = {
  id: string;
  slug: string | null;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  telehealth_enabled: boolean | null;
  states_served: string[] | null;
  organizations?: { name: string | null } | { name: string | null }[] | null;
};

export default async function AdminProvidersPage() {
  const { supabase, role, organizationName } = await getCurrentUserWithRole();
  const { data } = await supabase
    .from("providers")
    .select("id,slug,display_name,credentials,specialty,telehealth_enabled,states_served,organizations(name)")
    .order("display_name", { ascending: true });

  const providers = (data ?? []) as ProviderAdminRow[];

  return (
    <section className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Providers</span>
        <h1 className="mt-4 text-3xl font-semibold">Provider directory management</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          {role === "admin"
            ? "Review provider specialties, telehealth readiness, and organization assignment across the platform."
            : `These providers are currently visible inside ${organizationName ?? "your organization"}.`}
        </p>
      </section>

      <section className="grid gap-4">
        {providers.length === 0 ? (
          <div className="panel px-6 py-6 text-sm muted">No providers are visible for this tenant yet.</div>
        ) : (
          providers.map((provider) => {
            const organization = Array.isArray(provider.organizations)
              ? (provider.organizations[0] ?? null)
              : (provider.organizations ?? null);

            return (
              <article key={provider.id} className="panel px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <h2 className="text-2xl font-semibold">{provider.display_name}</h2>
                    <p className="mt-2 text-sm leading-6 muted">
                      {[provider.credentials, provider.specialty].filter(Boolean).join(" · ") || "Profile details in progress."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs muted">
                      {organization?.name ? (
                        <span className="rounded-full border border-[var(--border)] px-3 py-1">
                          {organization.name}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[var(--border)] px-3 py-1">
                        {provider.telehealth_enabled ? "Telehealth enabled" : "Telehealth setup pending"}
                      </span>
                      {(provider.states_served ?? []).map((state) => (
                        <span key={state} className="rounded-full border border-[var(--border)] px-3 py-1">
                          {state}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {provider.slug ? (
                      <Link href={`/providers/${provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
                        View public profile
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}
