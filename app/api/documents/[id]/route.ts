import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import { fetchPatientDocumentById } from "@/lib/carebridge/forms";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) {
    return NextResponse.json({ error: "Patient record not found." }, { status: 400 });
  }

  const { id } = await params;
  const document = await fetchPatientDocumentById(supabase, patient.id, id);
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.storage.from("patient-documents").remove([document.file_path]);
  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "patient",
    action: "document_deleted",
    entity_type: "document",
    entity_id: id,
    metadata_json: { appointment_id: document.appointment_id, category: document.category },
  });

  return NextResponse.json({ ok: true });
}
