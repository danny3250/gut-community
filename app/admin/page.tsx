import Link from "next/link";
import AdminMetricCard from "@/app/admin/components/AdminMetricCard";
import AdminSectionHeader from "@/app/admin/components/AdminSectionHeader";
import AdminTrendChart from "@/app/admin/components/AdminTrendChart";
import { createClient } from "@/lib/supabase/server";
import { fetchAdminDashboardMetrics } from "@/lib/carebridge/admin";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const metrics = await fetchAdminDashboardMetrics(supabase);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Total users" value={metrics.totalUsers.toLocaleString()} helper="Profiles with CareBridge access" />
        <AdminMetricCard label="Total providers" value={metrics.totalProviders.toLocaleString()} helper="Provider records on the platform" />
        <AdminMetricCard label="Pending applications" value={metrics.pendingProviderApplications.toLocaleString()} helper="Awaiting admin review" />
        <AdminMetricCard label="Appointments" value={metrics.appointmentsThisWeek.toLocaleString()} helper="Scheduled for this week" />
        <AdminMetricCard label="Daily check-ins" value={metrics.checkinsToday.toLocaleString()} helper="Submitted today" />
      </section>

      <section className="workspace-section grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <div className="grid gap-4">
          <AdminSectionHeader
            eyebrow="Platform analytics"
            title="Operational activity"
            description="Track core activity across access, scheduling, and provider growth without leaving the admin workspace."
          />
          <div className="grid gap-3 xl:grid-cols-3">
            <AdminTrendChart title="Users over time" description="New accounts in the last 7 days" points={metrics.userTrend} />
            <AdminTrendChart title="Appointments over time" description="Scheduled visit volume" points={metrics.appointmentTrend} color="#7ba18c" />
            <AdminTrendChart title="Provider signups" description="Provider growth and intake activity" points={metrics.providerTrend} color="#8c7bd1" />
          </div>
        </div>

        <section className="section-shell">
          <AdminSectionHeader eyebrow="Quick actions" title="Move through admin work faster" />
          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <QuickAction href="/admin/providers" title="Review provider applications" body="Approve, return to pending, reject, or suspend from one place." />
            <QuickAction href="/admin/users" title="View recent users" body="Review roles, access status, and account activity." />
            <QuickAction href="/admin/content" title="Moderate content" body="Manage recipes, education resources, and publication state." />
          </div>
        </section>
      </section>
    </div>
  );
}

function QuickAction({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="inline-panel block px-4 py-4 hover:bg-white/90">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-sm leading-6 muted">{body}</p>
    </Link>
  );
}
