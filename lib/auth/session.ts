import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@/lib/auth/roles";
import { getRoleHomePath } from "@/lib/config/brand";

type ProfileRoleRow = {
  role: Role;
  display_name: string | null;
  organization_id: string | null;
  organizations?: { name: string | null } | { name: string | null }[] | null;
};

export async function getCurrentUserWithRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      role: null as Role | null,
      displayName: null as string | null,
      organizationId: null as string | null,
      organizationName: null as string | null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,display_name,organization_id,organizations(name)")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  const organization = Array.isArray(profile?.organizations)
    ? (profile?.organizations[0] ?? null)
    : (profile?.organizations ?? null);

  return {
    supabase,
    user,
    role: profile?.role ?? null,
    displayName: profile?.display_name ?? null,
    organizationId: profile?.organization_id ?? null,
    organizationName: organization?.name ?? null,
  };
}

export async function getAuthenticatedUserOrRedirect() {
  const session = await getCurrentUserWithRole();
  if (!session.user) {
    redirect("/login");
  }
  return session;
}

export function getHomePathForRole(role: Role | null | undefined) {
  return getRoleHomePath(role);
}
