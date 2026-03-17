"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function LoginForm() {
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/app");
    router.refresh();
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
          placeholder="Enter your password"
          type="password"
          required
        />
      </div>

      <button className="btn-primary w-full" disabled={loading} type="submit">
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-sm leading-6 muted">
        Your CareBridge account gives you access to the right protected workspace for portal, provider,
        or admin workflows.
      </p>

      <p className="text-sm muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-[var(--accent-strong)]">
          Create one here
        </Link>
      </p>

      {msg && <p className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{msg}</p>}
    </form>
  );
}
