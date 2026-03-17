"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkNotificationReadButton({
  notificationId,
  disabled = false,
}: {
  notificationId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Saving..." : "Mark as read"}
    </button>
  );
}

export function MarkAllNotificationsReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Updating..." : "Mark all as read"}
    </button>
  );
}
