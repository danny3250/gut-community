import { redirect } from "next/navigation";
import CareWorkspaceShell from "@/app/components/CareWorkspaceShell";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/settings", label: "Settings" },
];

const secondaryLinks = [
  { href: "/resources", label: "Public resources" },
  { href: "/community", label: "Community overview" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentUserWithRole();
  if (!user) redirect("/login");
  if (!isAdmin(role) && role !== "support_staff") redirect("/portal");

  return (
    <CareWorkspaceShell
      areaLabel="Admin Portal"
      title="CareBridge administration"
      description="Users, providers, organizations, content, moderation, and audit visibility for healthcare operations."
      email={user.email ?? null}
      primaryLinks={adminLinks}
      secondaryLinks={secondaryLinks}
    >
      {children}
    </CareWorkspaceShell>
  );
}
