"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function SignupForm({
  nextHref = "/portal",
  role = "patient",
}: {
  nextHref?: string;
  role?: "patient" | "provider";
}) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          requested_role: role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextHref)}`,
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push(`/verify?next=${encodeURIComponent(nextHref)}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold">Email</label>
        <input
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Password</label>
        <input
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          type="password"
          required
        />
      </div>

      <button className="btn-primary w-full" disabled={loading} type="submit">
        {loading ? (role === "provider" ? "Starting application..." : "Creating account...") : role === "provider" ? "Start provider application" : "Create account"}
      </button>

      <p className="text-sm leading-6 muted">
        {role === "provider"
          ? "Create your provider applicant account, verify your email, and continue into reviewed onboarding."
          : "Start with public resources and step into protected portal workflows as CareBridge expands."}
      </p>

      <p className="text-sm muted">
        {role === "provider" ? "Already started an application? " : "Already a member? "}
        <Link href={`/login?next=${encodeURIComponent(nextHref)}`} className="font-semibold text-[var(--accent-strong)]">
          {role === "provider" ? "Sign in to continue" : "Sign in"}
        </Link>
      </p>

      {msg && <p className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{msg}</p>}
    </form>
  );
}
