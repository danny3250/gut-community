"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AppointmentActionButtonProps = {
  endpoint: string;
  label: string;
  pendingLabel: string;
  body?: Record<string, unknown>;
  variant?: "primary" | "secondary";
  onSuccessHref?: string;
  onSuccessRefresh?: boolean;
  confirmMessage?: string;
};

export default function AppointmentActionButton({
  endpoint,
  label,
  pendingLabel,
  body,
  variant = "secondary",
  onSuccessHref,
  onSuccessRefresh = true,
  confirmMessage,
}: AppointmentActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not update appointment.");
      return;
    }

    if (onSuccessHref) {
      router.push(onSuccessHref);
    } else if (onSuccessRefresh) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={variant === "primary" ? "btn-primary px-4 py-2 text-sm" : "btn-secondary px-4 py-2 text-sm"}
        onClick={onClick}
        disabled={loading}
      >
        {loading ? pendingLabel : label}
      </button>
      {message ? <div className="text-sm muted">{message}</div> : null}
    </div>
  );
}
