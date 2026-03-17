"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProviderVerificationActions({ providerId }: { providerId: string }) {
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(status: "verified" | "rejected" | "suspended" | "pending") {
    setLoadingState(status);
    setMessage(null);

    const response = await fetch(`/api/admin/providers/${providerId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        rejectionReason: status === "rejected" ? rejectionReason : null,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoadingState(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not update provider status.");
      return;
    }

    setRejectionReason("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => updateStatus("verified")} disabled={loadingState !== null}>
          {loadingState === "verified" ? "Approving..." : "Approve"}
        </button>
        <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => updateStatus("pending")} disabled={loadingState !== null}>
          {loadingState === "pending" ? "Saving..." : "Mark pending"}
        </button>
        <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => updateStatus("suspended")} disabled={loadingState !== null}>
          {loadingState === "suspended" ? "Saving..." : "Suspend"}
        </button>
      </div>

      <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
        <label className="mb-2 block text-sm font-semibold">Rejection reason</label>
        <textarea
          className="field min-h-[110px]"
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Optional notes the provider can use to revise and resubmit."
        />
        <button type="button" className="btn-secondary mt-3 px-4 py-2 text-sm" onClick={() => updateStatus("rejected")} disabled={loadingState !== null}>
          {loadingState === "rejected" ? "Rejecting..." : "Reject"}
        </button>
      </div>

      {message ? <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}
    </div>
  );
}
