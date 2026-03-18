import { redirect } from "next/navigation";
import CareWorkspaceShell from "@/app/components/CareWorkspaceShell";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/carebridge/notifications";
import { isAdmin, isProvider } from "@/lib/auth/roles";
import { fetchProviderApplicationByUserId, fetchProviderByUserId, hasActiveProviderAccess } from "@/lib/carebridge/providers";

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
  const [provider, application] = await Promise.all([
    fetchProviderByUserId(supabase, user.id),
    fetchProviderApplicationByUserId(supabase, user.id),
  ]);

  const hasApplicantAccess = Boolean(application || provider);
  if (!isProvider(role) && !isAdmin(role) && !hasApplicantAccess) redirect("/portal");

  const hasActiveAccess = isAdmin(role) || hasActiveProviderAccess(provider);
  const unreadNotifications = hasActiveAccess ? await getUnreadNotificationCount(supabase, user.id) : 0;
  const resolvedPrimaryLinks = (hasActiveAccess
    ? providerLinks
    : [
        { href: "/provider", label: "Application status" },
        { href: "/provider/onboarding", label: "Provider application" },
      ]
  ).map((link) => (link.href === "/provider/notifications" ? { ...link, badgeCount: unreadNotifications } : link));

  return (
    <CareWorkspaceShell
      areaLabel="Provider Portal"
      title={hasActiveAccess ? "CareBridge provider access" : "CareBridge provider application"}
      description={
        hasActiveAccess
          ? "Scheduling, patient review, visit launch, and communication tools for approved providers."
          : "Track your application status, update your information, and prepare for provider review."
      }
      email={user.email ?? null}
      primaryLinks={resolvedPrimaryLinks}
      secondaryLinks={secondaryLinks}
    >
      {children}
    </CareWorkspaceShell>
  );
}
