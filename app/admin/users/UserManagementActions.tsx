"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UserManagementActions({
  userId,
  currentRole,
  isDisabled,
}: {
  userId: string;
  currentRole: string;
  isDisabled: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"role" | "disabled" | null>(null);

  async function updateUser(payload: { role?: string; disabled?: boolean }) {
    setLoading(payload.role ? "role" : "disabled");
    setMessage(null);

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(null);

    if (!response.ok) {
      setMessage(body.error ?? "Could not update user.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={role}
        onChange={(event) => {
          const nextRole = event.target.value;
          setRole(nextRole);
          void updateUser({ role: nextRole });
        }}
        disabled={loading !== null}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
      >
        <option value="patient">Patient</option>
        <option value="provider">Provider</option>
        <option value="admin">Admin</option>
        <option value="organization_owner">Organization owner</option>
        <option value="support_staff">Support staff</option>
        <option value="moderator">Moderator</option>
      </select>
      <button
        type="button"
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        onClick={() => void updateUser({ disabled: !isDisabled })}
        disabled={loading !== null}
      >
        {loading === "disabled" ? "Saving..." : isDisabled ? "Enable" : "Disable"}
      </button>
      {message ? <span className="text-xs text-rose-700">{message}</span> : null}
    </div>
  );
}
