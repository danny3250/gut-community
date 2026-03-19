import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { fetchProviderByUserId, isProviderVerified } from "@/lib/carebridge/providers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, role } = await getCurrentUserWithRole();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,patient_id,appointment_id,uploaded_by_user_id,category,title,description,file_path,mime_type,file_size_bytes,created_at,patients(user_id),appointments(provider_id,providers(user_id))")
    .eq("id", id)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 400 });
  }
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const patient = Array.isArray(document.patients) ? document.patients[0] ?? null : document.patients ?? null;
  const appointment = Array.isArray(document.appointments) ? document.appointments[0] ?? null : document.appointments ?? null;
  const appointmentProvider = Array.isArray(appointment?.providers) ? appointment.providers[0] ?? null : appointment?.providers ?? null;

  const isAdmin =
    role === "admin" || role === "organization_owner" || role === "support_staff";
  const isPatientOwner = patient?.user_id === user.id;
  let isAuthorizedProvider = appointmentProvider?.user_id === user.id;

  if (isAuthorizedProvider) {
    const provider = await fetchProviderByUserId(supabase, user.id);
    isAuthorizedProvider = Boolean(provider && isProviderVerified(provider));
  }

  if (!isAdmin && !isPatientOwner && !isAuthorizedProvider) {
    return NextResponse.json({ error: "You do not have access to this document." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("patient-documents").createSignedUrl(document.file_path, 60 * 10);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not open document." }, { status: 400 });
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: role,
    action: "document_downloaded",
    entity_type: "document",
    entity_id: document.id,
    metadata_json: { appointment_id: document.appointment_id, category: document.category },
  });

  return NextResponse.redirect(data.signedUrl, {
    headers: {
      "Cache-Control": "no-store, private",
    },
  });
}
