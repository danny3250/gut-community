import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  CAREBRIDGE_PRIVACY_VERSION,
  CAREBRIDGE_TERMS_VERSION,
} from "@/lib/carebridge/policies";

type PolicyAcceptanceMetadata = {
  terms_version?: string | null;
  privacy_version?: string | null;
  accepted_at?: string | null;
  acceptance_source?: string | null;
};

export async function syncPolicyAcceptancesForUser(
  supabase: SupabaseClient,
  user: User,
  context?: { ipAddress?: string | null; userAgent?: string | null }
) {
  const metadata = (user.user_metadata ?? {}) as PolicyAcceptanceMetadata;
  const acceptedAt = metadata.accepted_at ?? new Date().toISOString();
  const termsVersion = metadata.terms_version;
  const privacyVersion = metadata.privacy_version;

  if (!termsVersion && !privacyVersion) {
    return;
  }

  const rows = [
    termsVersion
      ? {
          user_id: user.id,
          policy_type: "terms",
          policy_version: termsVersion,
          accepted_at: acceptedAt,
          acceptance_source: metadata.acceptance_source ?? "signup",
          ip_address: context?.ipAddress ?? null,
          user_agent: context?.userAgent ?? null,
        }
      : null,
    privacyVersion
      ? {
          user_id: user.id,
          policy_type: "privacy",
          policy_version: privacyVersion,
          accepted_at: acceptedAt,
          acceptance_source: metadata.acceptance_source ?? "signup",
          ip_address: context?.ipAddress ?? null,
          user_agent: context?.userAgent ?? null,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (rows.length === 0) return;

  const { data: existingRows, error: existingError } = await supabase
    .from("user_policy_acceptances")
    .select("policy_type,policy_version")
    .eq("user_id", user.id);

  if (existingError) throw existingError;

  const existingKeys = new Set(
    ((existingRows ?? []) as Array<{ policy_type: string; policy_version: string }>).map(
      (row) => `${row.policy_type}:${row.policy_version}`
    )
  );

  const rowsToInsert = rows.filter((row) => !existingKeys.has(`${row.policy_type}:${row.policy_version}`));
  if (rowsToInsert.length === 0) return;

  const { error: insertError } = await supabase.from("user_policy_acceptances").insert(rowsToInsert);
  if (insertError) throw insertError;
}

export function buildSignupPolicyMetadata() {
  return {
    terms_version: CAREBRIDGE_TERMS_VERSION,
    privacy_version: CAREBRIDGE_PRIVACY_VERSION,
    accepted_at: new Date().toISOString(),
    acceptance_source: "signup",
  };
}

export function hasCurrentRequiredPolicyAcceptance(user: User | null | undefined) {
  const metadata = (user?.user_metadata ?? {}) as PolicyAcceptanceMetadata;
  return (
    metadata.terms_version === CAREBRIDGE_TERMS_VERSION &&
    metadata.privacy_version === CAREBRIDGE_PRIVACY_VERSION
  );
}
