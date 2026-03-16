/**
 * Gut-Community Role Model (v1)
 * -----------------------------
 * Purpose: A single source of truth for role names and future intent.
 *
 * IMPORTANT:
 * - Today, only `admin` has elevated privileges (ex: can edit other users' roles).
 * - Other roles below are "reserved" for future feature gating (no extra access yet).
 * - We keep `profiles.role` as a single string (one role per user) for simplicity.
 * - If/when we need granular permissions, we'll move to RBAC:
 *     roles table + permissions + user_roles mapping.
 */

export const ROLES = [
  "user",
  "partner",
  "doctor",
  "moderator",
  "admin",
  // reserved org roles (no extra permissions yet)
  "owner",
  "it",
  "hr",
  "payroll",
  "manager",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Display labels used in UI badges.
 * Keep human-friendly strings here so they stay consistent.
 */
export const ROLE_LABEL: Record<Role, string> = {
  user: "User",
  partner: "Partner",
  doctor: "Doctor",
  moderator: "Moderator",
  admin: "Admin",
  owner: "Owner",
  it: "IT",
  hr: "HR",
  payroll: "Payroll",
  manager: "Manager",
};

/**
 * This is the ONLY role that grants extra powers right now.
 * (Admins can manage roles, moderate content, etc. later.)
 */
export function isAdmin(role: Role | null | undefined) {
  return role === "admin";
}

/**
 * Roles that get a badge in the UI (forum/recipes/blogs).
 * For now: show all non-user roles as a badge.
 */
export function shouldShowBadge(role: Role | null | undefined) {
  return !!role && role !== "user";
}
