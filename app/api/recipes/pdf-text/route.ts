// app/api/recipes/pdf-text/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

type Body = { path?: string };

function runExtractorScript(pdfFilePath: string): Promise<{ text: string; pages: number; charCount: number }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "pdf_extract.mjs");

    const child = spawn(process.execPath, [scriptPath, pdfFilePath], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Extractor exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`Failed to parse extractor output. stderr=${stderr}\nstdout=${stdout}`));
      }
    });
  });
}

export async function POST(req: Request) {
  console.log("[pdf-text] hit");

  let tmpFile: string | null = null;

  try {
    const body = (await req.json()) as Body;
    const pdfPath = body?.path;

    console.log("[pdf-text] requested path:", pdfPath);

    if (!pdfPath || typeof pdfPath !== "string") {
      return NextResponse.json({ error: "Missing 'path'." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server env missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabaseAdmin.storage.from("recipe-pdfs").download(pdfPath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Could not download PDF from Storage." },
        { status: 400 }
      );
    }

    console.log("[pdf-text] download ok");

    const ab = await data.arrayBuffer();
    const bytes = new Uint8Array(ab);

    console.log("[pdf-text] bytes:", bytes.length);

    // Write to temp file so the extractor script can read it
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gut-pdf-"));
    tmpFile = path.join(dir, "upload.pdf");
    await fs.writeFile(tmpFile, bytes);

    // Run extraction outside Next bundler
    const result = await runExtractorScript(tmpFile);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[pdf-text] ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "PDF extraction failed.", detail: String(err?.stack ?? err) },
      { status: 500 }
    );
  } finally {
    // Cleanup temp file/folder best-effort
    try {
      if (tmpFile) {
        await fs.rm(path.dirname(tmpFile), { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
}
