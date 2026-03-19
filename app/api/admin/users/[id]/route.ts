import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_ROLES = ["patient", "provider", "admin", "organization_owner", "support_staff", "moderator"] as const;

type Payload = {
  role?: (typeof ALLOWED_ROLES)[number];
  disabled?: boolean;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await getCurrentUserWithRole();
  const { id } = await params;

  if (!user || !role || !["admin", "organization_owner", "support_staff"].includes(role)) {
    return NextResponse.json({ error: "Only admins can manage users." }, { status: 403 });
  }

  const payload = (await request.json()) as Payload;
  const admin = createAdminClient();

  if (payload.role && ALLOWED_ROLES.includes(payload.role)) {
    const { error } = await admin.from("profiles").update({ role: payload.role, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (typeof payload.disabled === "boolean") {
    const authAdmin = admin.auth.admin as any;
    const { error } = await authAdmin.updateUserById(id, {
      ban_duration: payload.disabled ? "876000h" : "none",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
