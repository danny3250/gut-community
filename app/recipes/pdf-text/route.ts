import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const path = body?.path as string | undefined;

    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const supabase = await createClient();

    // Optional: require user to be logged in for this API
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase.storage.from("recipe-pdfs").download(path);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to download PDF" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    return NextResponse.json({ text: result.text ?? "" });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
