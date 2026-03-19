"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContentManagementActions({
  id,
  kind,
  status,
  href,
}: {
  id: string;
  kind: "recipe" | "resource";
  status: string;
  href: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"status" | "delete" | null>(null);
  const nextStatus = status === "published" || status === "public" ? "draft" : "published";

  async function updateContent(action: "status" | "delete") {
    setLoading(action);

    const response = await fetch(`/api/admin/content/${kind}/${id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "status" ? JSON.stringify({ status: nextStatus }) : undefined,
    });

    setLoading(null);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {href ? (
        <Link href={href} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm">
          Edit
        </Link>
      ) : null}
      <button type="button" className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm" onClick={() => void updateContent("status")} disabled={loading !== null}>
        {loading === "status" ? "Saving..." : nextStatus === "published" ? "Publish" : "Unpublish"}
      </button>
      <button type="button" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" onClick={() => void updateContent("delete")} disabled={loading !== null}>
        {loading === "delete" ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
