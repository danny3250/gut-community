import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/carebridge/notifications";
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
  reviewed_at: string | null;
  active_provider: {
    id: string;
    verification_status: string;
    organization_id: string | null;
  } | null;
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
    .select("id,user_id,status,organization_id,display_name,reviewed_at,active_provider:providers!providers_user_id_key(id,verification_status,organization_id)")
    .eq("id", id)
    .maybeSingle<ProviderApplicationAdminRow>();

  if (applicationError || !application) {
    return NextResponse.json({ error: applicationError?.message ?? "Provider application not found." }, { status: 404 });
  }

  const scopedOrganizationId = application.active_provider?.organization_id ?? application.organization_id;
  if (role !== "admin" && organizationId && scopedOrganizationId && scopedOrganizationId !== organizationId) {
    return NextResponse.json({ error: "You can only review providers in your organization." }, { status: 403 });
  }

  try {
    if (payload.status === "approved") {
      const { data: providerId, error } = await admin.rpc("approve_provider_application", {
        target_application_id: id,
        reviewer_user_id: user.id,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await admin.from("audit_logs").insert({
        actor_user_id: user.id,
        actor_role: role,
        action: "provider_application_approved",
        entity_type: "provider_application",
        entity_id: id,
        metadata_json: {
          previous_status: application.status,
          next_status: "approved",
          provider_id: providerId ?? null,
        },
      });

      await createNotification(admin, {
        userId: application.user_id,
        type: "provider_verified",
        title: "Provider profile verified",
        body: "Your provider profile is now active. You can access provider tools, appear in the directory, and accept bookings.",
        linkUrl: "/provider",
        metadata: {
          provider_application_id: id,
          provider_id: providerId ?? null,
          previous_status: application.status,
          next_status: "approved",
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (payload.status === "rejected") {
      const rejectionReason = payload.rejectionReason?.trim() || null;
      const { error } = await admin.rpc("reject_provider_application", {
        target_application_id: id,
        reviewer_user_id: user.id,
        rejection_note: rejectionReason,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await admin.from("audit_logs").insert({
        actor_user_id: user.id,
        actor_role: role,
        action: "provider_application_rejected",
        entity_type: "provider_application",
        entity_id: id,
        metadata_json: {
          previous_status: application.status,
          next_status: "rejected",
          rejection_reason: rejectionReason,
        },
      });

      await createNotification(admin, {
        userId: application.user_id,
        type: "provider_rejected",
        title: "Provider application not approved",
        body: rejectionReason || "Review the notes on your application, update your information, and resubmit when you are ready.",
        linkUrl: "/provider",
        metadata: {
          provider_application_id: id,
          previous_status: application.status,
          next_status: "rejected",
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (payload.status === "pending") {
      if (application.active_provider) {
        return NextResponse.json({ error: "Active providers cannot be moved back to pending from this action." }, { status: 400 });
      }

      const { error } = await admin
        .from("provider_applications")
        .update({
          status: "pending",
          reviewed_at: null,
          reviewed_by_user_id: null,
          rejection_reason: null,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await admin.from("audit_logs").insert({
        actor_user_id: user.id,
        actor_role: role,
        action: "provider_application_reopened",
        entity_type: "provider_application",
        entity_id: id,
        metadata_json: {
          previous_status: application.status,
          next_status: "pending",
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (payload.status === "suspended") {
      if (!application.active_provider) {
        return NextResponse.json({ error: "Only active providers can be suspended." }, { status: 400 });
      }

      const now = new Date().toISOString();
      const { error } = await admin
        .from("providers")
        .update({
          verification_status: "suspended",
          verified_at: null,
          verified_by_user_id: user.id,
          updated_at: now,
        })
        .eq("id", application.active_provider.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await admin.from("audit_logs").insert({
        actor_user_id: user.id,
        actor_role: role,
        action: "provider_suspended",
        entity_type: "provider",
        entity_id: application.active_provider.id,
        metadata_json: {
          provider_application_id: id,
          previous_status: application.active_provider.verification_status,
          next_status: "suspended",
        },
      });

      await createNotification(admin, {
        userId: application.user_id,
        type: "provider_suspended",
        title: "Provider access suspended",
        body: "Your public listing, bookings, and provider tools are temporarily paused.",
        linkUrl: "/provider",
        metadata: {
          provider_application_id: id,
          provider_id: application.active_provider.id,
          previous_status: application.active_provider.verification_status,
          next_status: "suspended",
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported provider status." }, { status: 400 });
  } catch (error) {
    console.error("[admin/provider-status] Failed to update provider application", {
      applicationId: id,
      requestedStatus: payload.status,
      error,
    });
    return NextResponse.json({ error: "Could not update provider status." }, { status: 500 });
  }
}
