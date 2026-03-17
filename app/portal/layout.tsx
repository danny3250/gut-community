import CareWorkspaceShell from "@/app/components/CareWorkspaceShell";
import { getAuthenticatedUserOrRedirect } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/carebridge/notifications";

const portalLinks = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/check-in", label: "Daily check-in" },
  { href: "/portal/health", label: "Health history" },
  { href: "/portal/recipes", label: "Recipes" },
  { href: "/portal/appointments", label: "Appointments" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/notifications", label: "Notifications" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/forms", label: "Forms" },
  { href: "/portal/resources", label: "Resources" },
  { href: "/portal/community", label: "Community" },
  { href: "/portal/profile", label: "Profile" },
] as const;

const secondaryLinks = [
  { href: "/providers", label: "Provider directory" },
  { href: "/resources", label: "Public resources" },
  { href: "/community", label: "Community" },
];

export default async function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getAuthenticatedUserOrRedirect();
  const unreadNotifications = await getUnreadNotificationCount(supabase, user.id);
  const resolvedPrimaryLinks = portalLinks.map((link) =>
    link.href === "/portal/notifications" ? { ...link, badgeCount: unreadNotifications } : link
  );

  return (
    <CareWorkspaceShell
      areaLabel="Patient Portal"
      title="CareBridge patient access"
      description="Appointments, messages, forms, resources, and telehealth-ready care workflows in one place."
      email={user?.email ?? null}
      primaryLinks={resolvedPrimaryLinks}
      secondaryLinks={secondaryLinks}
    >
      {children}
    </CareWorkspaceShell>
  );
}
