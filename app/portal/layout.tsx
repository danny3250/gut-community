import CareWorkspaceShell from "@/app/components/CareWorkspaceShell";
import { getAuthenticatedUserOrRedirect } from "@/lib/auth/session";

const portalLinks = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/appointments", label: "Appointments" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/forms", label: "Forms" },
  { href: "/portal/resources", label: "Resources" },
  { href: "/portal/community", label: "Community" },
  { href: "/portal/profile", label: "Profile" },
];

const secondaryLinks = [
  { href: "/providers", label: "Provider directory" },
  { href: "/resources", label: "Public resources" },
  { href: "/community", label: "Community" },
];

export default async function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthenticatedUserOrRedirect();

  return (
    <CareWorkspaceShell
      areaLabel="Patient Portal"
      title="CareBridge patient access"
      description="Appointments, messages, forms, resources, and telehealth-ready care workflows in one place."
      email={user?.email ?? null}
      primaryLinks={portalLinks}
      secondaryLinks={secondaryLinks}
    >
      {children}
    </CareWorkspaceShell>
  );
}
