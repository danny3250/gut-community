import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@/lib/auth/roles";
import { getRoleHomePath } from "@/lib/config/brand";

type ProfileRoleRow = {
  role: Role;
  display_name: string | null;
};

export async function getCurrentUserWithRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, role: null as Role | null, displayName: null as string | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,display_name")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  return {
    supabase,
    user,
    role: profile?.role ?? null,
    displayName: profile?.display_name ?? null,
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
