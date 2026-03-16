import { Role, ROLE_LABEL, shouldShowBadge } from "@/lib/auth/roles";

export function RoleBadge({ role }: { role: Role }) {
  if (!shouldShowBadge(role)) return null;

  return <span className="text-[10px] border rounded px-2 py-0.5">{ROLE_LABEL[role]}</span>;
}