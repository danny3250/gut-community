import { redirect } from "next/navigation";
import CareWorkspaceShell from "@/app/components/CareWorkspaceShell";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/carebridge/notifications";
import { isAdmin, isProvider } from "@/lib/auth/roles";

const providerLinks = [
  { href: "/provider", label: "Dashboard" },
  { href: "/provider/schedule", label: "Schedule" },
  { href: "/provider/patients", label: "Patients" },
  { href: "/provider/messages", label: "Messages" },
  { href: "/provider/notifications", label: "Notifications" },
  { href: "/provider/community", label: "Community" },
  { href: "/provider/settings", label: "Settings" },
] as const;

const secondaryLinks = [
  { href: "/providers", label: "Public directory" },
  { href: "/resources", label: "Resources" },
  { href: "/community", label: "Community overview" },
];

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const { user, role, supabase } = await getCurrentUserWithRole();

  if (!user) redirect("/login");
  if (!isProvider(role) && !isAdmin(role)) redirect("/portal");
  const unreadNotifications = await getUnreadNotificationCount(supabase, user.id);
  const resolvedPrimaryLinks = providerLinks.map((link) =>
    link.href === "/provider/notifications" ? { ...link, badgeCount: unreadNotifications } : link
  );

  return (
    <CareWorkspaceShell
      areaLabel="Provider Portal"
      title="CareBridge provider access"
      description="Scheduling, patient review, visit launch, and communication scaffolding for remote care workflows."
      email={user.email ?? null}
      primaryLinks={resolvedPrimaryLinks}
      secondaryLinks={secondaryLinks}
    >
      {children}
    </CareWorkspaceShell>
  );
}
