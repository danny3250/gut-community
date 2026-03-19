import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/carebridge/notifications";
import { syncProviderScopeForApprovedProvider } from "@/lib/carebridge/providers";
import { getCurrentUserWithRole } from "@/lib/auth/session";

type StatusPayload = {
  status?: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string | null;
};

type ProviderApplicationAdminRow = {
  id: string;
  user_id: string;
  status: string;
  organization_id: string | null;
  display_name: string | null;
  specialty_slugs: string[] | null;
  condition_focus_slugs: string[] | null;
  reviewed_at: string | null;
};

type ActiveProviderRow = {
  id: string;
  verification_status: string;
  organization_id: string | null;
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
  const { data: application, error: applicationError } = await admin
    .from("provider_applications")
    .select("id,user_id,status,organization_id,display_name,specialty_slugs,condition_focus_slugs,reviewed_at")
    .eq("id", id)
    .maybeSingle<ProviderApplicationAdminRow>();

  if (applicationError || !application) {
    return NextResponse.json({ error: applicationError?.message ?? "Provider application not found." }, { status: 404 });
  }

  const { data: activeProvider, error: providerError } = await admin
    .from("providers")
    .select("id,verification_status,organization_id")
    .eq("user_id", application.user_id)
    .maybeSingle<ActiveProviderRow>();

  if (providerError) {
    return NextResponse.json({ error: providerError.message }, { status: 400 });
  }

  const scopedOrganizationId = activeProvider?.organization_id ?? application.organization_id;
  if (role !== "admin" && organizationId && scopedOrganizationId && scopedOrganizationId !== organizationId) {
    return NextResponse.json({ error: "You can only review providers in your organization." }, { status: 403 });
  }

  try {
    const { data: providerId, error: statusError } = await admin.rpc("admin_set_provider_application_status", {
      target_application_id: id,
      next_status: payload.status,
      admin_user_id: user.id,
      rejection_note: payload.rejectionReason?.trim() || null,
    });

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 400 });
    }

    if (payload.status === "approved" && providerId) {
      await syncProviderScopeForApprovedProvider(
        admin,
        providerId,
        application.specialty_slugs ?? [],
        application.condition_focus_slugs ?? []
      );
    }

    const nextAuditAction =
      payload.status === "approved"
        ? "provider_application_approved"
        : payload.status === "pending"
          ? "provider_application_reopened"
          : payload.status === "rejected"
            ? "provider_application_rejected"
            : "provider_suspended";

    await admin.from("audit_logs").insert({
      actor_user_id: user.id,
      actor_role: role,
      action: nextAuditAction,
      entity_type: payload.status === "suspended" ? "provider" : "provider_application",
      entity_id: payload.status === "suspended" ? (providerId ?? id) : id,
      metadata_json: {
        provider_application_id: id,
        provider_id: providerId ?? null,
        previous_status: application.status,
        next_status: payload.status,
        rejection_reason: payload.rejectionReason?.trim() || null,
      },
    });

    const notificationType =
      payload.status === "approved"
        ? "provider_verified"
        : payload.status === "pending"
          ? "provider_application_received"
          : payload.status === "rejected"
            ? "provider_rejected"
            : "provider_suspended";

    const notificationTitle =
      payload.status === "approved"
        ? "Provider profile verified"
        : payload.status === "pending"
          ? "Provider application moved back to review"
          : payload.status === "rejected"
            ? "Provider application not approved"
            : "Provider access suspended";

    const notificationBody =
      payload.status === "approved"
        ? "Your provider profile is now active. You can access provider tools, appear in the directory, and accept bookings."
        : payload.status === "pending"
          ? "Your provider profile has been moved back to pending review. Public listing and bookings are paused until approval."
          : payload.status === "rejected"
            ? payload.rejectionReason?.trim() || "Review the notes on your application, update your information, and resubmit when you are ready."
            : "Your public listing, bookings, and provider tools are temporarily paused.";

    await createNotification(admin, {
      userId: application.user_id,
      type: notificationType,
      title: notificationTitle,
      body: notificationBody,
      linkUrl: "/provider",
      metadata: {
        provider_application_id: id,
        provider_id: providerId ?? null,
        previous_status: application.status,
        next_status: payload.status,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/provider-status] Failed to update provider application", {
      applicationId: id,
      requestedStatus: payload.status,
      error,
    });
    return NextResponse.json({ error: "Could not update provider status." }, { status: 500 });
  }
}
