import Link from "next/link";
import { Fragment } from "react";
import AdminSectionHeader from "@/app/admin/components/AdminSectionHeader";
import AdminStatusBadge from "@/app/admin/components/AdminStatusBadge";
import AdminTable from "@/app/admin/components/AdminTable";
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
    ? tenantScopedApplications.filter((application) => {
        if (selectedStatus === "suspended") {
          return application.active_provider?.verification_status === "suspended";
        }
        return application.status === selectedStatus;
      })
    : tenantScopedApplications;

  const statuses = ["pending", "approved", "suspended", "rejected"];

  return (
    <section className="grid gap-5">
      <AdminSectionHeader
        eyebrow="Providers"
        title="Provider application review"
        description={
          role === "admin"
            ? "Review provider intake, adjust verification state, and keep public directory access aligned with admin decisions."
            : `Review provider applications and status changes inside ${organizationName ?? "your organization"}.`
        }
        action={
          <form className="flex flex-wrap gap-2">
            <button type="submit" className={`rounded-full border px-4 py-2 text-sm ${selectedStatus ? "border-[var(--border)] bg-white/72" : "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"}`}>
              All
            </button>
            {statuses.map((status) => (
              <button
                key={status}
                type="submit"
                name="status"
                value={status}
                className={`rounded-full border px-4 py-2 text-sm capitalize ${selectedStatus === status ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border-[var(--border)] bg-white/72"}`}
              >
                {status}
              </button>
            ))}
          </form>
        }
      />

      {visibleApplications.length === 0 ? (
        <div className="rounded-[22px] border border-[var(--border)] bg-white/82 px-6 py-6 text-sm muted">
          No provider applications match this status yet.
        </div>
      ) : (
        <AdminTable columns={["Name", "Specialty", "Status", "States", "Submitted", "Actions"]}>
          {visibleApplications.map((application) => (
            <Fragment key={application.id}>
              <tr key={application.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-4 align-top">
                  <div className="font-semibold">{application.display_name}</div>
                  <div className="mt-1 text-xs muted">{application.full_name || "Provider application"}</div>
                </td>
                <td className="px-4 py-4 align-top text-[rgba(43,36,28,0.82)]">
                  {[application.credentials, application.specialty].filter(Boolean).join(" | ") || "In progress"}
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <AdminStatusBadge status={application.status} />
                    {application.active_provider?.verification_status === "suspended" ? <AdminStatusBadge status="suspended" /> : null}
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-[rgba(43,36,28,0.82)]">
                  {application.states_served.join(", ") || "None listed"}
                </td>
                <td className="px-4 py-4 align-top text-[rgba(43,36,28,0.82)]">
                  {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : "Not submitted"}
                </td>
                <td className="px-4 py-4 align-top">
                  <details className="group">
                    <summary className="cursor-pointer list-none rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm">
                      Review
                    </summary>
                    <div className="mt-3 w-[320px] max-w-full rounded-[18px] border border-[var(--border)] bg-[rgba(255,252,246,0.84)] p-4">
                      <ProviderVerificationActions
                        applicationId={application.id}
                        currentStatus={application.status}
                        hasActiveProvider={Boolean(application.active_provider)}
                        providerStatus={application.active_provider?.verification_status ?? null}
                      />
                    </div>
                  </details>
                </td>
              </tr>
              <tr className="border-b border-[var(--border)] last:border-b-0">
                <td colSpan={6} className="bg-[rgba(255,252,246,0.7)] px-4 py-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <DetailItem label="License states" value={application.license_states.join(", ") || "None listed"} />
                        <DetailItem label="License number" value={application.license_number || "Not provided"} />
                        <DetailItem label="NPI number" value={application.npi_number || "Not provided"} />
                        <DetailItem label="Organization" value={application.organization?.name || "Independent"} />
                      </div>
                      {application.bio ? <p className="mt-3 text-sm leading-6 muted">{application.bio}</p> : null}
                    </div>
                    <div className="rounded-[18px] border border-[var(--border)] bg-white/78 px-4 py-4 text-sm leading-6 muted">
                      {application.active_provider
                        ? `Active provider record: ${application.active_provider.verification_status}. ${application.active_provider.verification_status === "verified" ? "This profile is public and bookable." : "Public visibility is currently limited."}`
                        : getProviderApplicationMessage(application)}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {application.active_provider?.slug ? (
                          <Link href={`/providers/${application.active_provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
                            View public profile
                          </Link>
                        ) : null}
                        <Link href="/providers/join" className="btn-secondary px-4 py-2 text-sm">
                          View provider entry
                        </Link>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </Fragment>
          ))}
        </AdminTable>
      )}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-white/78 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-1.5 text-sm leading-6 text-[rgba(43,36,28,0.84)]">{value}</div>
    </div>
  );
}
