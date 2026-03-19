import CareWorkspaceShell from "@/app/components/CareWorkspaceShell";
import { getAuthenticatedUserOrRedirect } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/carebridge/notifications";
import { PRODUCT_LABELS } from "@/lib/carebridge/taxonomy";

const portalLinks = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/appointments", label: PRODUCT_LABELS.appointments },
  { href: "/portal/messages", label: PRODUCT_LABELS.messages },
  { href: "/portal/check-in", label: PRODUCT_LABELS.healthCheckins },
  { href: "/portal/summaries", label: "Care Summaries" },
  { href: "/portal/health", label: PRODUCT_LABELS.careHistory },
  { href: "/portal/forms", label: PRODUCT_LABELS.forms },
  { href: "/portal/documents", label: PRODUCT_LABELS.documents },
  { href: "/portal/recipes", label: PRODUCT_LABELS.recipesAndResources },
  { href: "/portal/notifications", label: PRODUCT_LABELS.notifications },
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
      areaLabel={PRODUCT_LABELS.patientWorkspace}
      title="CareBridge patient access"
      description="Appointments, care follow-up, forms, messages, and supportive health tools in one patient workspace."
      email={user?.email ?? null}
      primaryLinks={resolvedPrimaryLinks}
      secondaryLinks={secondaryLinks}
      showHeaderNavigation={false}
    >
      {children}
    </CareWorkspaceShell>
  );
}
