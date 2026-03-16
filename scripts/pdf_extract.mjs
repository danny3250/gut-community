// scripts/pdf_extract.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Missing PDF file path arg.");
    process.exit(1);
  }

  const data = new Uint8Array(await fs.readFile(filePath));

  // Import pdfjs normally in plain Node (no Next bundler involved)
  const pdfjsPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

  const pdfjs = await import(pathToFileURL(pdfjsPath).toString());

  // Point worker at real node_modules file URL
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

  // In plain Node, this will work without Turbopack rewriting imports
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  const out = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items
      .map((it) => (typeof it?.str === "string" ? it.str : ""))
      .filter(Boolean);

    const pageText = strings.join(" ").replace(/\s+/g, " ").trim();
    if (pageText) out.push(pageText);
  }

  const text = out.join("\n\n").trim();

  // Print JSON to stdout for the API route to consume
  process.stdout.write(
    JSON.stringify({
      text,
      pages: pdf.numPages,
      charCount: text.length,
    })
  );
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
