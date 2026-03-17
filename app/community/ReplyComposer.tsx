"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReplyComposerProps = {
  postId: string;
  canMarkOfficial: boolean;
  helperMessage?: string | null;
};

export default function ReplyComposer({ postId, canMarkOfficial, helperMessage = null }: ReplyComposerProps) {
  const supabase = createClient();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [markOfficial, setMarkOfficial] = useState(canMarkOfficial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setSaving(false);
      setMessage("Please sign in before replying.");
      return;
    }

    const payload = {
      post_id: postId,
      author_user_id: user.id,
      body: body.trim(),
      verified_at: canMarkOfficial && markOfficial ? new Date().toISOString() : null,
      is_provider_response: canMarkOfficial ? markOfficial : false,
    };

    const { error } = await supabase.from("community_replies").insert(payload);
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBody("");
    if (canMarkOfficial) {
      setMarkOfficial(true);
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold">Your reply</label>
        <textarea
          className="field min-h-[180px]"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share a helpful response, next step, or question."
          required
        />
      </div>

      {canMarkOfficial ? (
        <label className="flex items-start gap-3 rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={markOfficial}
            onChange={(event) => setMarkOfficial(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block font-semibold">Mark this as an official provider response</span>
            <span className="mt-1 block muted">
              This highlights your reply as a verified provider response in the community thread.
            </span>
          </span>
        </label>
      ) : helperMessage ? (
        <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm muted">
          {helperMessage}
        </div>
      ) : null}

      {message ? <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">{message}</div> : null}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Posting..." : "Post reply"}
      </button>
    </form>
  );
}
