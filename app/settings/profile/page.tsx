"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Role, ROLE_LABEL } from "@/lib/auth/roles";

type Profile = {
  id: string;
  display_name: string | null;
  role: Role;
};

function roleLabel(role: Profile["role"]) {
  return ROLE_LABEL[role];
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

      const nextProfile = data as Profile;
      setProfile(nextProfile);
      setDisplayName(nextProfile.display_name ?? "");
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
      if ((error as { code?: string }).code === "23505") {
        setMsg("That display name is already taken. Try another.");
      } else {
        setMsg(error.message);
      }
      return;
    }

    setMsg("Saved.");
    setProfile({ ...profile, display_name: cleaned });
  }

  if (loading) {
    return (
      <main className="shell py-6 sm:py-10">
        <div className="panel max-w-3xl px-6 py-4 text-sm muted">Loading...</div>
      </main>
    );
  }

  return (
    <main className="shell py-6 sm:py-10">
      <section className="panel mx-auto max-w-3xl space-y-6 px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <span className="eyebrow">Member profile</span>
          <h1 className="text-4xl font-semibold">Profile settings</h1>
          <p className="max-w-2xl text-sm leading-6 muted">
            Keep your display name and visible identity tidy so community participation and future portal
            interactions feel consistent across CareBridge.
          </p>
        </div>

        {msg && <div className="rounded-[24px] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm">{msg}</div>}

        {!profile ? (
          <div className="text-sm muted">No profile found.</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[24px] bg-[var(--accent-soft)]/55 px-5 py-4 text-sm">
              <span className="muted">Current role</span>{" "}
              <span className="ml-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
                {roleLabel(profile.role)}
              </span>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Display name</label>
              <input
                className="field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex M."
              />
              <div className="mt-2 text-xs leading-5 muted">
                This is what other people may see in community areas and future shared platform experiences.
              </div>
            </div>

            <button className="btn-primary" type="button" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
