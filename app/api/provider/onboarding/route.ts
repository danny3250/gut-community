import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/carebridge/notifications";
import { fetchProviderApplicationByUserId } from "@/lib/carebridge/providers";

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
  try {
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

    const existingApplication = await fetchProviderApplicationByUserId(supabase, user.id);
    const now = new Date().toISOString();

    const statesServed = normalizeStateList(payload.statesServed);
    const licenseStates = normalizeStateList(payload.licenseStates?.length ? payload.licenseStates : payload.statesServed);

    const applicationPayload = {
      user_id: user.id,
      full_name: payload.legalName?.trim() || payload.displayName.trim(),
      display_name: payload.displayName.trim(),
      credentials: payload.credentials?.trim() || null,
      specialty: payload.specialty?.trim() || null,
      bio: payload.bio?.trim() || null,
      states_served: statesServed,
      license_states: licenseStates,
      license_number: payload.licenseNumber?.trim() || null,
      npi_number: payload.npiNumber?.trim() || null,
      telehealth_enabled: payload.telehealthEnabled ?? true,
      organization_id: payload.organizationId || null,
      is_accepting_patients: payload.isAcceptingPatients ?? false,
      status: "pending",
      submitted_at: existingApplication?.submitted_at ?? now,
      reviewed_at: null,
      reviewed_by_user_id: null,
      rejection_reason: null,
      updated_at: now,
    };

    const { data: applicationRow, error: applicationError } = existingApplication
      ? await supabase
          .from("provider_applications")
          .update(applicationPayload)
          .eq("id", existingApplication.id)
          .select("id,status")
          .single()
      : await supabase
          .from("provider_applications")
          .insert(applicationPayload)
          .select("id,status")
          .single();

    if (applicationError || !applicationRow) {
      return NextResponse.json(
        { error: applicationError?.message ?? "Could not save provider application." },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        user_id: user.id,
        display_name: payload.displayName.trim(),
        organization_id: payload.organizationId || null,
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      actor_role: "patient",
      action: "provider_application_submitted",
      entity_type: "provider_application",
      entity_id: applicationRow.id,
      metadata_json: {
        application_status: "pending",
        states_served: statesServed,
        telehealth_enabled: payload.telehealthEnabled ?? true,
      },
    });

    if (auditError) {
      console.error("[provider/onboarding] audit insert failed", auditError);
    }

    try {
      await createNotification(supabase, {
        userId: user.id,
        type: "provider_application_received",
        title: "Provider application received",
        body: "Your provider profile has been submitted for review. Public listing and bookings will activate after verification.",
        linkUrl: "/provider",
        metadata: {
          provider_application_id: applicationRow.id,
          application_status: "pending",
        },
      });
    } catch (notificationError) {
      console.error("[provider/onboarding] notification insert failed", notificationError);
    }

    return NextResponse.json({ ok: true, applicationId: applicationRow.id, status: applicationRow.status });
  } catch (error) {
    console.error("[provider/onboarding] unexpected failure", error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unexpected provider onboarding failure."
            : "Could not submit provider onboarding.",
      },
      { status: 500 }
    );
  }
}
