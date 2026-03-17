import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchPublicProviders } from "@/lib/carebridge/providers";

type ProvidersPageProps = {
  searchParams: Promise<{
    q?: string;
    organization?: string;
    specialty?: string;
    state?: string;
    telehealth?: string;
  }>;
};

export default async function ProvidersPage({ searchParams }: ProvidersPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const providers = await fetchPublicProviders(supabase);

  const query = resolvedSearchParams.q?.trim().toLowerCase() ?? "";
  const organizationFilter = resolvedSearchParams.organization?.trim() ?? "";
  const specialtyFilter = resolvedSearchParams.specialty?.trim() ?? "";
  const stateFilter = resolvedSearchParams.state?.trim() ?? "";
  const telehealthOnly = resolvedSearchParams.telehealth === "true";

  const organizations = Array.from(
    new Set(providers.map((provider) => provider.organization?.name).filter(Boolean))
  ).sort();
  const specialties = Array.from(new Set(providers.map((provider) => provider.specialty).filter(Boolean))).sort();
  const states = Array.from(new Set(providers.flatMap((provider) => provider.states_served))).sort();

  const filteredProviders = providers.filter((provider) => {
    if (query) {
      const haystack = [
        provider.display_name,
        provider.credentials,
        provider.specialty,
        provider.bio,
        provider.organization?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    if (organizationFilter && provider.organization?.name !== organizationFilter) return false;
    if (specialtyFilter && provider.specialty !== specialtyFilter) return false;
    if (stateFilter && !provider.states_served.includes(stateFilter)) return false;
    if (telehealthOnly && !provider.telehealth_enabled) return false;
    return true;
  });

  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Provider directory</span>
          <h1 className="section-title">Browse providers and organizations offering easier access to care.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            Search for providers by specialty, state served, and telehealth availability, then open a profile
            to review their care focus and request an appointment.
          </p>
        </div>

        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Directory filters
          </div>
          <p className="mt-3 text-sm leading-6 muted">
            Use the search and filters below to narrow the list quickly without losing the overall view of
            who is available.
          </p>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <form className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_auto]">
          <label className="text-sm">
            <div className="mb-2 font-medium">Search</div>
            <input
              type="text"
              name="q"
              defaultValue={resolvedSearchParams.q ?? ""}
              className="field"
              placeholder="Search by provider, specialty, or organization"
            />
          </label>

          <label className="text-sm">
            <div className="mb-2 font-medium">Organization</div>
            <select name="organization" defaultValue={organizationFilter} className="field">
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization} value={organization ?? ""}>
                  {organization}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-2 font-medium">Specialty</div>
            <select name="specialty" defaultValue={specialtyFilter} className="field">
              <option value="">All specialties</option>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty ?? ""}>
                  {specialty}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-2 font-medium">State served</div>
            <select name="state" defaultValue={stateFilter} className="field">
              <option value="">All states</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="telehealth" value="true" defaultChecked={telehealthOnly} />
              Telehealth only
            </label>
            <button type="submit" className="btn-primary">
              Apply filters
            </button>
          </div>
        </form>
      </section>

      {filteredProviders.length === 0 ? (
        <section className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">No providers match those filters yet.</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Try a broader search or clear one of the filters to view more options.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => (
            <article key={provider.id} className="panel px-6 py-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">{provider.display_name}</h2>
                  <p className="mt-1 text-sm muted">
                    {[provider.credentials, provider.specialty].filter(Boolean).join(" | ")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    provider.telehealth_enabled
                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border border-[var(--border)] bg-white/70"
                  }`}
                >
                  {provider.telehealth_enabled ? "Telehealth available" : "In-person details later"}
                </span>
              </div>

              {provider.organization?.name ? (
                <p className="mt-3 text-sm leading-6 muted">Organization: {provider.organization.name}</p>
              ) : null}

              {provider.bio ? <p className="mt-3 text-sm leading-6 muted">{provider.bio}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {provider.states_served.map((state) => (
                  <span key={state} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs opacity-80">
                    {state}
                  </span>
                ))}
              </div>

              <div className="mt-5">
                <Link href={`/providers/${provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
                  View profile
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
