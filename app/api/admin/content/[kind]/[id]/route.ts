import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { user, role } = await getCurrentUserWithRole();
  const { kind, id } = await params;

  if (!user || !role || !["admin", "organization_owner", "support_staff"].includes(role)) {
    return NextResponse.json({ error: "Only admins can manage content." }, { status: 403 });
  }

  const payload = (await request.json()) as { status?: string };
  const admin = createAdminClient();

  if (kind === "recipe") {
    const isPublished = payload.status === "published";
    const { error } = await admin
      .from("recipes")
      .update({
        status: isPublished ? "published" : "draft",
        is_public: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (kind === "resource") {
    const { error } = await admin
      .from("content_resources")
      .update({
        visibility: payload.status === "published" ? "public" : "private",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported content type." }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { user, role } = await getCurrentUserWithRole();
  const { kind, id } = await params;

  if (!user || !role || !["admin", "organization_owner", "support_staff"].includes(role)) {
    return NextResponse.json({ error: "Only admins can manage content." }, { status: 403 });
  }

  const admin = createAdminClient();
  const table = kind === "recipe" ? "recipes" : kind === "resource" ? "content_resources" : null;

  if (!table) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 400 });
  }

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
