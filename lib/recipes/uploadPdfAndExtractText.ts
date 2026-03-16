import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadPdfAndExtractText(
  supabase: SupabaseClient,
  file: File
): Promise<string> {
  console.log("[PDF helper] start");

  console.log("[PDF helper] auth.getUser...");
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  console.log("[PDF helper] auth.getUser done", { userErr: userErr?.message });

  if (userErr) throw new Error(userErr.message);
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not logged in.");

  const safeName = file.name.replaceAll(" ", "_");
  const path = `imports/${userId}/${Date.now()}-${safeName}`;
  console.log("[PDF helper] upload path", path);

  console.log("[PDF helper] storage.upload...");
  const { error: uploadError } = await supabase.storage
    .from("recipe-pdfs")
    .upload(path, file, { upsert: false });

  console.log("[PDF helper] storage.upload done", { uploadError: uploadError?.message });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  console.log("[PDF helper] fetch /api/recipes/pdf-text ...");
  const res = await fetch("/api/recipes/pdf-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  console.log("[PDF helper] fetch returned", { status: res.status });

  const bodyText = await res.text();
  console.log("[PDF helper] response body length", bodyText.length);

  let json: any = null;
  try {
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    console.log("[PDF helper] removing uploaded pdf due to failure...");
    await supabase.storage.from("recipe-pdfs").remove([path]);

    const msg = json?.error || bodyText || `PDF extract failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  const text = (json?.text ?? "").toString();
  console.log("[PDF helper] extracted text length", text.length);

  if (!text.trim()) {
    throw new Error("No text could be extracted (PDF may be scanned/image-only).");
  }

  return text;
}
