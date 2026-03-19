"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProviderVerificationActions({
  applicationId,
  currentStatus,
  hasActiveProvider,
  providerStatus,
}: {
  applicationId: string;
  currentStatus: string;
  hasActiveProvider: boolean;
  providerStatus: string | null;
}) {
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(status: "approved" | "rejected" | "suspended" | "pending") {
    setLoadingState(status);
    setMessage(null);

    const response = await fetch(`/api/admin/providers/${applicationId}/status`, {
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

  const isApproved = currentStatus === "approved" && providerStatus !== "suspended";
  const isPending = currentStatus === "pending";
  const isSuspended = providerStatus === "suspended";
  const isRejected = currentStatus === "rejected";

  const approveLabel = "Approved";
  const pendingLabel = "Pending";
  const suspendLabel = "Suspend";
  const rejectLabel = "Reject";

  const activeButtonClass = "btn-primary px-4 py-2 text-sm";
  const inactiveButtonClass = "btn-secondary px-4 py-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={isApproved ? activeButtonClass : inactiveButtonClass}
          onClick={() => updateStatus("approved")}
          disabled={loadingState !== null || isApproved}
        >
          {loadingState === "approved" ? "Approving..." : approveLabel}
        </button>
        <button
          type="button"
          className={isPending ? activeButtonClass : inactiveButtonClass}
          onClick={() => updateStatus("pending")}
          disabled={loadingState !== null || isPending}
        >
          {loadingState === "pending" ? "Saving..." : pendingLabel}
        </button>
        <button
          type="button"
          className={isSuspended ? activeButtonClass : inactiveButtonClass}
          onClick={() => updateStatus("suspended")}
          disabled={loadingState !== null || !hasActiveProvider || isSuspended}
        >
          {loadingState === "suspended" ? "Saving..." : suspendLabel}
        </button>
      </div>

      <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
        <label className="mb-2 block text-sm font-semibold">Rejection notes</label>
        <textarea
          className="field min-h-[110px]"
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Optional notes the provider can use to revise and resubmit."
        />
        <button
          type="button"
          className={`${isRejected ? activeButtonClass : inactiveButtonClass} mt-3`}
          onClick={() => updateStatus("rejected")}
          disabled={loadingState !== null || isRejected}
        >
          {loadingState === "rejected" ? "Rejecting..." : rejectLabel}
        </button>
      </div>

      {message ? <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}
    </div>
  );
}
