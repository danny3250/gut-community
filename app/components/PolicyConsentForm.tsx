"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CAREBRIDGE_POLICY_LAST_UPDATED,
  CAREBRIDGE_PRIVACY_VERSION,
  CAREBRIDGE_TERMS_VERSION,
} from "@/lib/carebridge/policies";

export default function PolicyConsentForm({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted) {
      setMessage("You must agree to the Terms & Conditions and acknowledge the Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/policy-acceptance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepted: true }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not record policy acceptance.");
      return;
    }

    router.replace(nextHref);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-4 text-sm leading-6">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent-strong)]">
            Terms & Conditions
          </Link>{" "}
          and acknowledge the{" "}
          <Link href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent-strong)]">
            Privacy Policy
          </Link>
          . Current versions: Terms {CAREBRIDGE_TERMS_VERSION}, Privacy {CAREBRIDGE_PRIVACY_VERSION}. Last updated {CAREBRIDGE_POLICY_LAST_UPDATED}.
        </span>
      </label>

      <button className="btn-primary" disabled={loading} type="submit">
        {loading ? "Saving acceptance..." : "Agree and continue"}
      </button>

      {message ? <p className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</p> : null}
    </form>
  );
}

