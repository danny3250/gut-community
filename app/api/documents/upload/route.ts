import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before uploading a document." }, { status: 401 });
  }

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) {
    return NextResponse.json({ error: "Patient record not found." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const category = String(formData.get("category") || "other");
  const title = String(formData.get("title") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const appointmentId = String(formData.get("appointmentId") || "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "This file type is not supported." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 400 });
  }

  if (appointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", appointmentId)
      .eq("patient_id", patient.id)
      .maybeSingle();

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 403 });
    }
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${patient.id}/${randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("patient-documents")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: documentRow, error: insertError } = await supabase
    .from("documents")
    .insert({
      patient_id: patient.id,
      appointment_id: appointmentId,
      uploaded_by_user_id: user.id,
      category,
      title,
      description,
      file_path: path,
      mime_type: file.type,
      file_size_bytes: file.size,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !documentRow) {
    await admin.storage.from("patient-documents").remove([path]);
    return NextResponse.json({ error: insertError?.message ?? "Could not save document." }, { status: 400 });
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "patient",
    action: "document_uploaded",
    entity_type: "document",
    entity_id: documentRow.id,
    metadata_json: { appointment_id: appointmentId, category, mime_type: file.type },
  });

  return NextResponse.json({ ok: true, documentId: documentRow.id });
}
