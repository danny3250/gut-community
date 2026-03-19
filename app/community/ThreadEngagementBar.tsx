"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommunitySource } from "@/lib/community";

type ThreadEngagementBarProps = {
  targetType: "thread" | "reply";
  source: CommunitySource;
  targetId: string;
  initialScore: number;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: number;
  initialSaved?: boolean;
  canSave?: boolean;
  canInteract: boolean;
};

export default function ThreadEngagementBar({
  targetType,
  source,
  targetId,
  initialScore,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = 0,
  initialSaved = false,
  canSave = false,
  canInteract,
}: ThreadEngagementBarProps) {
  const supabase = createClient();
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleVote(nextVote: 1 | -1) {
    if (!canInteract) {
      router.push("/login");
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    const voteTable = targetType === "thread" ? "community_thread_votes" : "community_reply_votes";
    const sourceColumn = targetType === "thread" ? "thread_source" : "reply_source";
    const idColumn = targetType === "thread" ? "thread_id" : "reply_id";
    const removingVote = userVote === nextVote;

    const query = supabase
      .from(voteTable)
      .delete()
      .eq("user_id", user.id)
      .eq(sourceColumn, source)
      .eq(idColumn, targetId);

    const { error } = removingVote
      ? await query
      : await supabase.from(voteTable).upsert(
          {
            user_id: user.id,
            [sourceColumn]: source,
            [idColumn]: targetId,
            vote_value: nextVote,
          },
          { onConflict: `user_id,${sourceColumn},${idColumn}` }
        );

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const updatedVote = removingVote ? 0 : nextVote;
    setUpvotes((current) => current - (userVote === 1 ? 1 : 0) + (updatedVote === 1 ? 1 : 0));
    setDownvotes((current) => current - (userVote === -1 ? 1 : 0) + (updatedVote === -1 ? 1 : 0));
    setScore((current) => current - userVote + updatedVote);
    setUserVote(updatedVote);
    router.refresh();
  }

  async function handleSaveToggle() {
    if (!canInteract) {
      router.push("/login");
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    const { error } = saved
      ? await supabase
          .from("community_saved_threads")
          .delete()
          .eq("user_id", user.id)
          .eq("thread_source", source)
          .eq("thread_id", targetId)
      : await supabase.from("community_saved_threads").insert({
          user_id: user.id,
          thread_source: source,
          thread_id: targetId,
        });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSaved(!saved);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={() => void handleVote(1)}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
            userVote === 1
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              : "border-[var(--border)] bg-white/72 text-[var(--foreground)]"
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none grayscale">
            👍
          </span>
          <span className="text-xs font-semibold">{upvotes}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleVote(-1)}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
            userVote === -1
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              : "border-[var(--border)] bg-white/72 text-[var(--foreground)]"
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none grayscale">
            👎
          </span>
          <span className="text-xs font-semibold">{downvotes}</span>
        </button>
        <span className="min-w-12 text-center font-medium text-[var(--accent-strong)]">{score}</span>
        {canSave ? (
          <button
            type="button"
            onClick={() => void handleSaveToggle()}
            disabled={saving}
            className={`rounded-full border px-3 py-1.5 transition ${
              saved
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--border)] bg-white/72 text-[var(--foreground)]"
            }`}
          >
            {saved ? "Pinned" : "Pin thread"}
          </button>
        ) : null}
      </div>
      {message ? <div className="text-right text-xs muted">{message}</div> : null}
    </div>
  );
}
