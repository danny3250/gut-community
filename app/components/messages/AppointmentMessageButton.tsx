"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AppointmentMessageButton({
  appointmentId,
  hrefBase,
  existingConversationId,
}: {
  appointmentId: string;
  hrefBase: "/portal/messages" | "/provider/messages";
  existingConversationId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onOpen() {
    if (existingConversationId) {
      router.push(`${hrefBase}/${existingConversationId}`);
      return;
    }

    setLoading(true);
    const response = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { conversationId?: string; error?: string };
    setLoading(false);

    if (!response.ok || !payload.conversationId) {
      return;
    }

    router.push(`${hrefBase}/${payload.conversationId}`);
    router.refresh();
  }

  return (
    <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onOpen} disabled={loading}>
      {loading ? "Opening..." : existingConversationId ? "View messages" : "Start conversation"}
    </button>
  );
}
