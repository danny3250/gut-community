"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  display_name: string | null;
  role: "user" | "moderator" | "admin" | "doctor";
};

function roleLabel(role: Profile["role"]) {
  if (role === "doctor") return "Doctor";
  if (role === "moderator") return "Moderator";
  if (role === "admin") return "Admin";
  return "User";
}

export default function ProfileSettingsPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        setMsg("Not logged in.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", userId)
        .single();

      if (error || !data) {
        setMsg(error?.message ?? "Could not load profile.");
        setLoading(false);
        return;
      }

      const p = data as Profile;
      setProfile(p);
      setDisplayName(p.display_name ?? "");
      setLoading(false);
    })();
  }, [supabase]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    setMsg(null);

    const cleaned = displayName.trim();

    if (cleaned.length < 3) {
      setSaving(false);
      setMsg("Display name must be at least 3 characters.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: cleaned })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      // Unique violation
      if ((error as any).code === "23505") {
        setMsg("That display name is already taken. Try another.");
      } else {
        setMsg(error.message);
      }
      return;
    }

    setMsg("Saved.");
    setProfile({ ...profile, display_name: cleaned });
  }

  if (loading) return <div className="p-6 text-sm opacity-70">Loading…</div>;

  return (
    <main className="p-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {msg && <div className="text-sm border rounded p-3">{msg}</div>}

      {!profile ? (
        <div className="text-sm opacity-70">No profile found.</div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm opacity-80">
            Role:{" "}
            <span className="inline-block text-xs border rounded px-2 py-0.5">
              {roleLabel(profile.role)}
            </span>
          </div>

          <label className="block text-sm font-medium">Display name</label>
          <input
            className="w-full border rounded p-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. CalmGutGuide"
          />
          <div className="text-xs opacity-70">
            This is what others will see on your posts, comments, recipes, and blogs.
          </div>

          <button
            className="border rounded px-3 py-2"
            type="button"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </main>
  );
}
