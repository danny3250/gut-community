import { getCurrentUserWithRole } from "@/lib/auth/session";

type UserRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  role: string;
  organization_id: string | null;
  organizations?: { name: string | null } | { name: string | null }[] | null;
};

export default async function AdminUsersPage() {
  const { supabase, role, organizationName } = await getCurrentUserWithRole();
  const { data } = await supabase
    .from("profiles")
    .select("id,user_id,display_name,role,organization_id,organizations(name)")
    .order("display_name", { ascending: true });

  const users = (data ?? []) as UserRow[];

  return (
    <section className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Users</span>
        <h1 className="mt-4 text-3xl font-semibold">Tenant-aware access overview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          {role === "admin"
            ? "Review platform users, role distribution, and organization ownership from one place."
            : `These users are visible inside ${organizationName ?? "your organization"} based on tenant boundaries.`}
        </p>
      </section>

      <section className="grid gap-4">
        {users.length === 0 ? (
          <div className="panel px-6 py-6 text-sm muted">No users are visible for this tenant yet.</div>
        ) : (
          users.map((user) => {
            const organization = Array.isArray(user.organizations)
              ? (user.organizations[0] ?? null)
              : (user.organizations ?? null);

            return (
              <article key={user.id} className="panel px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{user.display_name ?? "Unnamed user"}</h2>
                    <p className="mt-2 text-sm leading-6 muted">
                      {user.role.replace(/_/g, " ")}
                      {organization?.name ? ` · ${organization.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs muted">
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      Profile: {user.id.slice(0, 8)}
                    </span>
                    {user.user_id ? (
                      <span className="rounded-full border border-[var(--border)] px-3 py-1">
                        User: {user.user_id.slice(0, 8)}
                      </span>
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
