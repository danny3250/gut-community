import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAuthorizedDocumentById } from "@/lib/carebridge/forms";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  const document = await fetchAuthorizedDocumentById(supabase, id);
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("patient-documents").createSignedUrl(document.file_path, 60 * 10);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not open document." }, { status: 400 });
  }

  return NextResponse.redirect(data.signedUrl);
}
