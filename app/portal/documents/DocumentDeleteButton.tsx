"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DocumentDeleteButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!window.confirm("Remove this document?")) {
      return;
    }

    setDeleting(true);
    const response = await fetch(`/api/documents/${documentId}`, {
      method: "DELETE",
    });
    setDeleting(false);

    if (!response.ok) {
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={deleting}
      className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? "Removing..." : "Remove"}
    </button>
  );
}
