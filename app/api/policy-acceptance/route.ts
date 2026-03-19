import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSignupPolicyMetadata,
  syncPolicyAcceptancesForUser,
} from "@/lib/carebridge/policy-acceptance";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { accepted?: boolean };
    if (!body.accepted) {
      return NextResponse.json({ error: "Policy acceptance is required." }, { status: 400 });
    }

    const metadata = {
      ...(user.user_metadata ?? {}),
      ...buildSignupPolicyMetadata(),
      acceptance_source: "required_consent",
    };

    const { data: updatedUserData, error: updateError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const acceptedUser = updatedUserData.user ?? { ...user, user_metadata: metadata };
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;

    try {
      await syncPolicyAcceptancesForUser(acceptedUser, {
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save policy acceptance.";
      return NextResponse.json(
        {
          error:
            message.includes("user_policy_acceptances") || message.includes("schema cache")
              ? "Policy acceptance storage is not available yet. Run the latest database migrations and try again."
              : message,
        },
        { status: 500 }
      );
    }

    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      actor_role: null,
      action: "policy_acceptance_recorded",
      entity_type: "user_policy_acceptance",
      entity_id: user.id,
      metadata_json: {
        terms_version: metadata.terms_version,
        privacy_version: metadata.privacy_version,
        acceptance_source: metadata.acceptance_source,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record policy acceptance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
