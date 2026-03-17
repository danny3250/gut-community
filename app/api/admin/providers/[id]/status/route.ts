import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/carebridge/notifications";
import { getCurrentUserWithRole } from "@/lib/auth/session";

type StatusPayload = {
  status?: "pending" | "verified" | "rejected" | "suspended";
  rejectionReason?: string | null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, organizationId } = await getCurrentUserWithRole();
  const { id } = await params;

  if (!user || !role || !["admin", "organization_owner", "support_staff"].includes(role)) {
    return NextResponse.json({ error: "Only admins can update provider verification." }, { status: 403 });
  }

  const payload = (await request.json()) as StatusPayload;
  if (!payload.status) {
    return NextResponse.json({ error: "Missing provider verification status." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existingProvider, error: providerError } = await admin
    .from("providers")
    .select("id,user_id,display_name,organization_id,verification_status")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string; display_name: string | null; organization_id: string | null; verification_status: string }>();

  if (providerError || !existingProvider) {
    return NextResponse.json({ error: providerError?.message ?? "Provider not found." }, { status: 404 });
  }

  if (role !== "admin" && organizationId && existingProvider.organization_id !== organizationId) {
    return NextResponse.json({ error: "You can only review providers in your organization." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const updatePayload = {
    verification_status: payload.status,
    verified_at: payload.status === "verified" ? now : null,
    verified_by_user_id: payload.status === "verified" ? user.id : null,
    rejection_reason: payload.status === "rejected" ? payload.rejectionReason?.trim() || null : null,
    updated_at: now,
  };

  const { error: updateError } = await admin.from("providers").update(updatePayload).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: role,
    action:
      payload.status === "verified"
        ? "provider_verified"
        : payload.status === "rejected"
          ? "provider_rejected"
          : payload.status === "suspended"
            ? "provider_suspended"
            : "provider_status_updated",
    entity_type: "provider",
    entity_id: id,
    metadata_json: {
      previous_status: existingProvider.verification_status,
      next_status: payload.status,
      rejection_reason: payload.rejectionReason ?? null,
    },
  });

  const notificationType =
    payload.status === "verified"
      ? "provider_verified"
      : payload.status === "rejected"
        ? "provider_rejected"
        : payload.status === "suspended"
          ? "provider_suspended"
          : "provider_application_received";

  await createNotification(admin, {
    userId: existingProvider.user_id,
    type: notificationType,
    title:
      payload.status === "verified"
        ? "Provider profile verified"
        : payload.status === "rejected"
          ? "Provider application not approved"
          : payload.status === "suspended"
            ? "Provider access suspended"
            : "Provider application updated",
    body:
      payload.status === "verified"
        ? "Your provider profile is now visible to patients and can accept bookings."
        : payload.status === "rejected"
          ? payload.rejectionReason?.trim() || "Review the notes on your application and update your information to resubmit."
          : payload.status === "suspended"
            ? "Your provider access is temporarily disabled. Public listing and bookings are paused."
            : "Your provider application has been updated.",
    linkUrl: "/provider",
    metadata: {
      provider_id: id,
      previous_status: existingProvider.verification_status,
      next_status: payload.status,
    },
  });

  return NextResponse.json({ ok: true });
}
