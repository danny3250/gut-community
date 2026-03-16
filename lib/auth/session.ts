import { createClient } from "@/lib/supabase/server";
import { Role } from "@/lib/auth/roles";

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
