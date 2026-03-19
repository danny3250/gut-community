import AdminFilterBar from "@/app/admin/components/AdminFilterBar";
import AdminSectionHeader from "@/app/admin/components/AdminSectionHeader";
import AdminStatusBadge from "@/app/admin/components/AdminStatusBadge";
import AdminTable from "@/app/admin/components/AdminTable";
import UserManagementActions from "./UserManagementActions";
import { fetchAdminUsers } from "@/lib/carebridge/admin";

type AdminUsersPageProps = {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const resolvedSearchParams = await searchParams;
  const users = await fetchAdminUsers();
  const roleFilter = resolvedSearchParams.role?.trim() ?? "";
  const statusFilter = resolvedSearchParams.status?.trim() ?? "";
  const query = resolvedSearchParams.q?.trim().toLowerCase() ?? "";

  const filteredUsers = users.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (statusFilter) {
      const computedStatus = user.disabled ? "disabled" : "active";
      if (computedStatus !== statusFilter) return false;
    }
    if (query) {
      const haystack = [user.display_name, user.email, user.role].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <section className="grid gap-4">
      <AdminSectionHeader
        eyebrow="Users"
        title="User management"
        description="Review account access, adjust platform roles, and manage user availability from a compact operations table."
      />

      <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <AdminFilterBar>
          <input
            type="text"
            name="q"
            defaultValue={resolvedSearchParams.q ?? ""}
            placeholder="Search name, email, or role"
            className="w-full min-w-[220px] bg-transparent text-sm outline-none"
          />
        </AdminFilterBar>
        <AdminFilterBar>
          <select name="role" defaultValue={roleFilter} className="w-full bg-transparent text-sm outline-none">
            <option value="">All roles</option>
            <option value="patient">Patient</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
            <option value="organization_owner">Organization owner</option>
            <option value="support_staff">Support staff</option>
            <option value="moderator">Moderator</option>
          </select>
        </AdminFilterBar>
        <AdminFilterBar>
          <select name="status" defaultValue={statusFilter} className="w-full bg-transparent text-sm outline-none">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </AdminFilterBar>
        <button type="submit" className="rounded-[16px] bg-[#1f2937] px-4 py-3 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      {filteredUsers.length === 0 ? (
        <div className="rounded-[22px] border border-[var(--border)] bg-white/82 px-6 py-6 text-sm muted">
          No users are available in the admin workspace yet.
        </div>
      ) : (
        <AdminTable columns={["Name", "Email", "Role", "Created", "Status", "Actions"]}>
          {filteredUsers.map((user) => (
            <tr key={user.id} className="border-b border-[var(--border)] last:border-b-0">
              <td className="px-4 py-3.5 align-top">
                <div className="font-semibold">{user.display_name ?? "Unnamed user"}</div>
                <div className="mt-1 text-xs muted">ID {user.id.slice(0, 8)}</div>
              </td>
              <td className="px-4 py-3.5 align-top text-[rgba(43,36,28,0.82)]">{user.email ?? "No email"}</td>
              <td className="px-4 py-3.5 align-top">
                <AdminStatusBadge status={user.role ?? "patient"} />
              </td>
              <td className="px-4 py-3.5 align-top text-[rgba(43,36,28,0.82)]">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
              </td>
              <td className="px-4 py-3.5 align-top">
                <AdminStatusBadge status={user.disabled ? "disabled" : "active"} />
              </td>
              <td className="px-4 py-3.5 align-top">
                <UserManagementActions userId={user.id} currentRole={user.role ?? "patient"} isDisabled={user.disabled} />
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </section>
  );
}
