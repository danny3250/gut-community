"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinVisitButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onJoin() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/visits/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });

    const payload = (await response.json()) as { visitId?: string; error?: string };
    setLoading(false);

    if (!response.ok || !payload.visitId) {
      setMessage(payload.error ?? "Could not open visit.");
      return;
    }

    router.push(`/visit/${payload.visitId}`);
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onJoin} disabled={loading}>
        {loading ? "Opening..." : "Join visit"}
      </button>
      {message ? <div className="text-sm muted">{message}</div> : null}
    </div>
  );
}
