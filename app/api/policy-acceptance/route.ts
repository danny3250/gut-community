import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSignupPolicyMetadata,
  syncPolicyAcceptancesForUser,
} from "@/lib/carebridge/policy-acceptance";

export async function POST(request: Request) {
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

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: metadata,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const acceptedUser = data.user ?? { ...user, user_metadata: metadata };
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  await syncPolicyAcceptancesForUser(acceptedUser, {
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  });

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
}

