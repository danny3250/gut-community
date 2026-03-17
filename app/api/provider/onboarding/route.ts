import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/carebridge/notifications";
import { fetchProviderByUserId, slugifyProviderName } from "@/lib/carebridge/providers";

type OnboardingPayload = {
  legalName?: string;
  displayName?: string;
  credentials?: string | null;
  specialty?: string | null;
  bio?: string | null;
  statesServed?: string[];
  licenseStates?: string[];
  licenseNumber?: string | null;
  npiNumber?: string | null;
  telehealthEnabled?: boolean;
  organizationId?: string | null;
  isAcceptingPatients?: boolean;
};

function normalizeStateList(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before submitting onboarding." }, { status: 401 });
  }

  const payload = (await request.json()) as OnboardingPayload;
  if (!payload.displayName?.trim()) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const existingProvider = await fetchProviderByUserId(admin, user.id);
  const verificationStatus = existingProvider?.verification_status === "verified" ? "verified" : "pending";
  const now = new Date().toISOString();

  const statesServed = normalizeStateList(payload.statesServed);
  const licenseStates = normalizeStateList(payload.licenseStates?.length ? payload.licenseStates : payload.statesServed);

  const providerPayload = {
    user_id: user.id,
    display_name: payload.displayName.trim(),
    slug: slugifyProviderName(payload.displayName.trim()),
    credentials: payload.credentials?.trim() || null,
    specialty: payload.specialty?.trim() || null,
    bio: payload.bio?.trim() || null,
    states_served: statesServed,
    license_states: licenseStates,
    license_number: payload.licenseNumber?.trim() || null,
    npi_number: payload.npiNumber?.trim() || null,
    telehealth_enabled: payload.telehealthEnabled ?? true,
    organization_id: payload.organizationId || null,
    verification_status: verificationStatus,
    verification_submitted_at: now,
    onboarding_completed: true,
    is_accepting_patients: payload.isAcceptingPatients ?? false,
    rejection_reason: verificationStatus === "pending" ? null : existingProvider?.rejection_reason ?? null,
    updated_at: now,
  };

  const { data: providerRow, error: providerError } = existingProvider
    ? await admin.from("providers").update(providerPayload).eq("id", existingProvider.id).select("id").single()
    : await admin.from("providers").insert(providerPayload).select("id").single();

  if (providerError || !providerRow) {
    return NextResponse.json({ error: providerError?.message ?? "Could not save provider application." }, { status: 400 });
  }

  const profilePayload = {
    id: user.id,
    user_id: user.id,
    role: "provider",
    display_name: payload.displayName.trim(),
    organization_id: payload.organizationId || null,
    updated_at: now,
  };

  const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "provider",
    action: "provider_submitted_application",
    entity_type: "provider",
    entity_id: providerRow.id,
    metadata_json: {
      verification_status: verificationStatus,
      states_served: statesServed,
      telehealth_enabled: payload.telehealthEnabled ?? true,
    },
  });

  await createNotification(admin, {
    userId: user.id,
    type: "provider_application_received",
    title: "Provider application received",
    body: "Your provider profile has been submitted for review. Public listing and bookings will activate after verification.",
    linkUrl: "/provider",
    metadata: {
      provider_id: providerRow.id,
      verification_status: verificationStatus,
    },
  });

  return NextResponse.json({ ok: true, providerId: providerRow.id, verificationStatus });
}
