export const ROLES = [
  "patient",
  "provider",
  "admin",
  "organization_owner",
  "support_staff",
  "moderator",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  provider: "Provider",
  admin: "Admin",
  organization_owner: "Organization Owner",
  support_staff: "Support Staff",
  moderator: "Moderator",
};

export function isAdmin(role: Role | null | undefined) {
  return role === "admin" || role === "organization_owner";
}

export function isProvider(role: Role | null | undefined) {
  return role === "provider";
}

export function isPatient(role: Role | null | undefined) {
  return role === "patient" || role == null;
}

export function shouldShowBadge(role: Role | null | undefined) {
  return !!role && role !== "patient";
}
