import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { fetchProviderApplicationsForAdmin, getProviderApplicationMessage } from "@/lib/carebridge/providers";
import ProviderVerificationActions from "./ProviderVerificationActions";

type AdminProvidersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminProvidersPage({ searchParams }: AdminProvidersPageProps) {
  const resolvedSearchParams = await searchParams;
  const { supabase, role, organizationId, organizationName } = await getCurrentUserWithRole();
  const applications = await fetchProviderApplicationsForAdmin(supabase);
  const selectedStatus = resolvedSearchParams.status?.trim() ?? "";

  const tenantScopedApplications =
    role === "admin" || !organizationId
      ? applications
      : applications.filter((application) => application.organization_id === organizationId);

  const visibleApplications = selectedStatus
    ? tenantScopedApplications.filter((application) => application.status === selectedStatus)
    : tenantScopedApplications;

  const statuses = ["pending", "approved", "rejected"];

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
        {visibleApplications.length === 0 ? (
          <div className="panel px-6 py-6 text-sm muted">No provider applications match this status yet.</div>
        ) : (
          visibleApplications.map((application) => (
            <article key={application.id} className="panel px-6 py-6 sm:px-8">
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold">{application.display_name}</h2>
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold capitalize text-[var(--accent-strong)]">
                      {application.status}
                    </span>
                    {application.active_provider?.verification_status === "suspended" ? (
                      <span className="rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold capitalize">
                        Suspended
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 muted">
                    {[application.credentials, application.specialty].filter(Boolean).join(" | ") || "Profile details still in progress."}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoCard label="Applicant name" value={application.full_name || application.display_name} />
                    <InfoCard label="States served" value={application.states_served.join(", ") || "None listed"} />
                    <InfoCard label="License states" value={application.license_states.join(", ") || "None listed"} />
                    <InfoCard label="License number" value={application.license_number || "Not provided"} />
                    <InfoCard label="NPI number" value={application.npi_number || "Not provided"} />
                    <InfoCard label="Organization" value={application.organization?.name || "Independent"} />
                    <InfoCard label="Submitted" value={application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "Not submitted"} />
                  </div>

                  {application.bio ? <p className="mt-4 text-sm leading-6 muted">{application.bio}</p> : null}

                  <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm leading-6 muted">
                    {application.active_provider
                      ? `Active provider record: ${application.active_provider.verification_status}. ${application.active_provider.verification_status === "verified" ? "This provider can appear publicly and accept bookings." : "Public visibility and bookings are currently limited."}`
                      : getProviderApplicationMessage(application)}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {application.active_provider?.slug && application.active_provider.verification_status === "verified" ? (
                      <Link href={`/providers/${application.active_provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
                        View public profile
                      </Link>
                    ) : null}
                    <Link href="/providers/join" className="btn-secondary px-4 py-2 text-sm">
                      View provider entry page
                    </Link>
                  </div>
                </div>

                <ProviderVerificationActions
                  applicationId={application.id}
                  currentStatus={application.status}
                  hasActiveProvider={Boolean(application.active_provider)}
                  providerStatus={application.active_provider?.verification_status ?? null}
                />
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
