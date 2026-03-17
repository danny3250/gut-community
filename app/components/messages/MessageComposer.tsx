"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not send message.");
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="text-sm">
        <div className="mb-2 font-medium">Message</div>
        <textarea
          className="field min-h-[140px]"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your message here."
          required
        />
      </label>

      {message ? <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
