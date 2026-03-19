import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
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

  await admin.from("user_policy_acceptances").upsert(rows, {
    onConflict: "user_id,policy_type,policy_version",
    ignoreDuplicates: false,
  });
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

