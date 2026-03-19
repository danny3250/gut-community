import AdminSectionHeader from "@/app/admin/components/AdminSectionHeader";
import AdminStatusBadge from "@/app/admin/components/AdminStatusBadge";
import AdminTable from "@/app/admin/components/AdminTable";
import ContentManagementActions from "./ContentManagementActions";
import { createClient } from "@/lib/supabase/server";
import { fetchAdminContentRows } from "@/lib/carebridge/admin";

export default async function AdminContentPage() {
  const supabase = await createClient();
  const rows = await fetchAdminContentRows(supabase);

  return (
    <section className="grid gap-5">
      <AdminSectionHeader
        eyebrow="Content"
        title="Content management"
        description="Manage published recipes and education resources with compact workflow controls instead of oversized content cards."
      />

      {rows.length === 0 ? (
        <div className="rounded-[22px] border border-[var(--border)] bg-white/82 px-6 py-6 text-sm muted">
          No content items are available yet.
        </div>
      ) : (
        <AdminTable columns={["Title", "Type", "Status", "Created", "Actions"]}>
          {rows.map((row) => (
            <tr key={`${row.kind}-${row.id}`} className="border-b border-[var(--border)] last:border-b-0">
              <td className="px-4 py-4 align-top">
                <div className="font-semibold">{row.title}</div>
              </td>
              <td className="px-4 py-4 align-top capitalize text-[rgba(43,36,28,0.82)]">{row.kind}</td>
              <td className="px-4 py-4 align-top">
                <AdminStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-4 align-top text-[rgba(43,36,28,0.82)]">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : "Unknown"}
              </td>
              <td className="px-4 py-4 align-top">
                <ContentManagementActions id={row.id} kind={row.kind} status={row.status} href={row.href} />
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </section>
  );
}
