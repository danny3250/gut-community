import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { fetchAllProvidersForAdmin, getProviderVerificationMessage } from "@/lib/carebridge/providers";
import ProviderVerificationActions from "./ProviderVerificationActions";

type AdminProvidersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminProvidersPage({ searchParams }: AdminProvidersPageProps) {
  const resolvedSearchParams = await searchParams;
  const { supabase, role, organizationId, organizationName } = await getCurrentUserWithRole();
  const providers = await fetchAllProvidersForAdmin(supabase);
  const selectedStatus = resolvedSearchParams.status?.trim() ?? "";

  const tenantScopedProviders =
    role === "admin" || !organizationId
      ? providers
      : providers.filter((provider) => provider.organization_id === organizationId);

  const visibleProviders = selectedStatus
    ? tenantScopedProviders.filter((provider) => provider.verification_status === selectedStatus)
    : tenantScopedProviders;

  const statuses = ["draft", "pending", "verified", "rejected", "suspended"];

  return (
    <section className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Providers</span>
        <h1 className="mt-4 text-3xl font-semibold">Provider onboarding and verification review</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          {role === "admin"
            ? "Review applications, approve or reject provider access, and control who becomes publicly visible and bookable."
            : `Review provider applications and status changes inside ${organizationName ?? "your organization"}.`}
        </p>
        <form className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className={`btn-secondary px-4 py-2 text-sm ${selectedStatus ? "" : "border-[var(--accent)] text-[var(--accent-strong)]"}`}>
            All statuses
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              type="submit"
              name="status"
              value={status}
              className={`btn-secondary px-4 py-2 text-sm capitalize ${selectedStatus === status ? "border-[var(--accent)] text-[var(--accent-strong)]" : ""}`}
            >
              {status}
            </button>
          ))}
        </form>
      </section>

      <section className="grid gap-4">
        {visibleProviders.length === 0 ? (
          <div className="panel px-6 py-6 text-sm muted">No provider applications match this status yet.</div>
        ) : (
          visibleProviders.map((provider) => (
            <article key={provider.id} className="panel px-6 py-6 sm:px-8">
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold">{provider.display_name}</h2>
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold capitalize text-[var(--accent-strong)]">
                      {provider.verification_status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 muted">
                    {[provider.credentials, provider.specialty].filter(Boolean).join(" | ") || "Profile details still in progress."}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoCard label="States served" value={provider.states_served.join(", ") || "None listed"} />
                    <InfoCard label="License states" value={(provider.license_states ?? []).join(", ") || "None listed"} />
                    <InfoCard label="License number" value={provider.license_number || "Not provided"} />
                    <InfoCard label="NPI number" value={provider.npi_number || "Not provided"} />
                    <InfoCard label="Organization" value={provider.organization?.name || "Independent"} />
                    <InfoCard label="Submitted" value={provider.verification_submitted_at ? new Date(provider.verification_submitted_at).toLocaleString() : "Not submitted"} />
                  </div>

                  {provider.bio ? <p className="mt-4 text-sm leading-6 muted">{provider.bio}</p> : null}

                  <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm leading-6 muted">
                    {getProviderVerificationMessage(provider)}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {provider.slug && provider.verification_status === "verified" ? (
                      <Link href={`/providers/${provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
                        View public profile
                      </Link>
                    ) : null}
                    <Link href="/provider/onboarding" className="btn-secondary px-4 py-2 text-sm">
                      View onboarding route
                    </Link>
                  </div>
                </div>

                <ProviderVerificationActions providerId={provider.id} />
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-sm leading-6 muted">{value}</div>
    </div>
  );
}
