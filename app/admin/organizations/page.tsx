import { getCurrentUserWithRole } from "@/lib/auth/session";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

type CountRow = {
  organization_id: string | null;
};

export default async function AdminOrganizationsPage() {
  const { supabase, role, organizationName } = await getCurrentUserWithRole();

  const [{ data: organizations }, { data: providers }, { data: appointments }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id,name,slug,description,contact_email,contact_phone")
      .order("name", { ascending: true }),
    supabase.from("providers").select("organization_id"),
    supabase.from("appointments").select("organization_id"),
  ]);

  const providerCounts = countByOrganization((providers ?? []) as CountRow[]);
  const appointmentCounts = countByOrganization((appointments ?? []) as CountRow[]);
  const rows = (organizations ?? []) as OrganizationRow[];

  return (
    <section className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Organizations</span>
        <h1 className="mt-4 text-3xl font-semibold">Clinic and organization oversight</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          {role === "admin"
            ? "Review clinics, provider distribution, and appointment load across the CareBridge tenant base."
            : `You are viewing the organization workspace for ${organizationName ?? "your clinic"}.`}
        </p>
      </section>

      <section className="grid gap-4">
        {rows.length === 0 ? (
          <div className="panel px-6 py-6 text-sm muted">No organizations are visible for this account yet.</div>
        ) : (
          rows.map((organization) => (
            <article key={organization.id} className="panel px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <h2 className="text-2xl font-semibold">{organization.name}</h2>
                  <p className="mt-2 text-sm leading-6 muted">{organization.description ?? "Organization profile in progress."}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs muted">
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">Slug: {organization.slug}</span>
                    {organization.contact_email ? (
                      <span className="rounded-full border border-[var(--border)] px-3 py-1">{organization.contact_email}</span>
                    ) : null}
                    {organization.contact_phone ? (
                      <span className="rounded-full border border-[var(--border)] px-3 py-1">{organization.contact_phone}</span>
                    ) : null}
                  </div>
                </div>

                <div className="grid min-w-[240px] gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <StatCard label="Providers" value={String(providerCounts.get(organization.id) ?? 0)} />
                  <StatCard label="Appointments" value={String(appointmentCounts.get(organization.id) ?? 0)} />
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function countByOrganization(rows: CountRow[]) {
  return rows.reduce((map, row) => {
    const key = row.organization_id;
    if (!key) return map;
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
