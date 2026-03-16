"use client";

import { useState } from "react";

export default function CopyShoppingListButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onCopy}>
      {copied ? "Copied" : "Copy shopping list"}
    </button>
  );
}
