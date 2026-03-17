"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LaunchVisitButton({
  appointmentId,
  label = "Launch visit",
}: {
  appointmentId: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onLaunch() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/visits/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });

    const payload = (await response.json()) as { visitId?: string; error?: string };
    setLoading(false);

    if (!response.ok || !payload.visitId) {
      setMessage(payload.error ?? "Could not launch visit.");
      return;
    }

    router.push(`/visit/${payload.visitId}`);
    router.refresh();
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      <button type="button" className="btn-primary" onClick={onLaunch} disabled={loading}>
        {loading ? "Launching..." : label}
      </button>
      {message ? <div className="text-sm muted">{message}</div> : null}
    </div>
  );
}
