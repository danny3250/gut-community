"use client";

import { useState } from "react";

type ShoppingListActionsProps = {
  copyText: string;
  shareUrl: string;
};

export default function ShoppingListActions({ copyText, shareUrl }: ShoppingListActionsProps) {
  const [copiedList, setCopiedList] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleCopyList() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedList(true);
      window.setTimeout(() => setCopiedList(false), 1800);
    } catch {
      setCopiedList(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(false);
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "CareBridge shopping list",
          url: shareUrl,
        });
        return;
      } catch {
        // fall through to copy link
      }
    }

    await handleCopyLink();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={handleCopyList}>
        {copiedList ? "Copied list" : "Copy shopping list"}
      </button>
      <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => window.print()}>
        Print
      </button>
      <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => void handleShare()}>
        {copiedLink ? "Copied link" : "Share list"}
      </button>
    </div>
  );
}
