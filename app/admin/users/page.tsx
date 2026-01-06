"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Role = "user" | "moderator" | "doctor" | "admin";

type ProfileRow = {
  id: string;
  display_name: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

const ROLE_OPTIONS: Role[] = ["user", "moderator", "doctor", "admin"];

function roleLabel(role: Role) {
  if (role === "doctor") return "Doctor";
  if (role === "moderator") return "Moderator";
  if (role === "admin") return "Admin";
  return "User";
}

export default function AdminUsersPage() {
  const supabase = createClient();

  const [meRole, setMeRole] = useState<Role | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const name = (r.display_name ?? "").toLowerCase();
      return name.includes(term) || r.id.toLowerCase().includes(term);
    });
  }, [rows, q]);

  // Load current user + role
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setMeId(uid);

      if (!uid) {
        setMeRole(null);
        setRows([]);
        setLoading(false);
        setErr("Not logged in.");
        return;
      }

      const { data: meProfile, error: meErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (meErr || !meProfile) {
        setMeRole(null);
        setRows([]);
        setLoading(false);
        setErr(meErr?.message ?? "Could not load your profile.");
        return;
      }

      setMeRole((meProfile as any).role as Role);

      // Load all profiles (admins only should use this page)
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,role,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        setRows([]);
        setErr(error.message);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as ProfileRow[]);
      setLoading(false);
    })();
  }, [supabase]);

  async function updateRole(userId: string, newRole: Role) {
    setSavingId(userId);
    setErr(null);

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    setSavingId(null);

    if (error) {
      setErr(error.message);
      return;
    }

    setRows((prev) =>
      prev.map((r) => (r.id === userId ? { ...r, role: newRole } : r))
    );
  }

  async function updateDisplayName(userId: string, displayName: string) {
    const cleaned = displayName.trim() === "" ? null : displayName.trim();

    setSavingId(userId);
    setErr(null);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: cleaned })
      .eq("id", userId);

    setSavingId(null);

    if (error) {
      // unique violation
      if ((error as any).code === "23505") {
        setErr("That display name is already taken.");
      } else {
        setErr(error.message);
      }
      return;
    }

    setRows((prev) =>
      prev.map((r) => (r.id === userId ? { ...r, display_name: cleaned } : r))
    );
  }

  if (loading) {
    return (
      <main className="p-6 max-w-5xl">
        <div className="text-sm opacity-70">Loading…</div>
      </main>
    );
  }

  // Access gate (UI)
  if (!meId) {
    return (
      <main className="p-6 max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold">Admin: Users</h1>
        <div className="text-sm border rounded p-3">You must be logged in.</div>
        <Link className="underline" href="/login">
          Go to login
        </Link>
      </main>
    );
  }

  if (meRole !== "admin") {
    return (
      <main className="p-6 max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold">Admin: Users</h1>
        <div className="text-sm border rounded p-3">
          Access denied. You are not an admin.
        </div>
        <Link className="underline" href="/">
          Go home
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl space-y-4">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin: Users</h1>
        <Link className="border rounded px-3 py-2" href="/">
          Home
        </Link>
      </header>

      {err && <div className="text-sm border rounded p-3">Error: {err}</div>}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-sm opacity-70">
          Logged in as <span className="font-mono">{meId}</span> (
          <span className="font-medium">{roleLabel(meRole)}</span>)
        </div>

        <input
          className="border rounded p-2 w-full sm:w-80"
          placeholder="Search display name or UUID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-black/5 p-3 text-xs font-medium">
          <div className="col-span-4">Display name</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-5">User ID</div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-4 text-sm opacity-70">No users found.</div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 gap-2 p-3 border-t items-center"
            >
              <div className="col-span-4">
                <input
                  className="w-full border rounded p-2 text-sm"
                  defaultValue={r.display_name ?? ""}
                  placeholder="(no display name)"
                  onBlur={(e) => updateDisplayName(r.id, e.target.value)}
                  disabled={savingId === r.id}
                />
                <div className="text-[11px] opacity-60 mt-1">
                  Edit then click away to save
                </div>
              </div>

              <div className="col-span-3">
                <select
                  className="w-full border rounded p-2 text-sm"
                  value={r.role}
                  onChange={(e) => updateRole(r.id, e.target.value as Role)}
                  disabled={savingId === r.id}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {roleLabel(opt)}
                    </option>
                  ))}
                </select>

                {r.id === meId && (
                  <div className="text-[11px] opacity-60 mt-1">
                    This is you
                  </div>
                )}
              </div>

              <div className="col-span-5">
                <div className="font-mono text-xs break-all">{r.id}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-xs opacity-60">
        Notes: Role changes are protected by RLS (admin-only). Display name must be unique (case-insensitive).
      </div>
    </main>
  );
}
