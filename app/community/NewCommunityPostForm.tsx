"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TOPICS = [
  "digestive health",
  "nutrition",
  "chronic pain",
  "mental health",
  "general wellness",
  "telehealth questions",
];

export default function NewCommunityPostForm() {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
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
      setMessage("Please sign in before creating a post.");
      return;
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        author_user_id: user.id,
        title: title.trim(),
        body: body.trim(),
        topic,
        visibility: "members",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setMessage(error?.message ?? "Could not create the post.");
      return;
    }

    router.push(`/community/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <div className="mb-2 font-medium">Topic</div>
        <select className="field" value={topic} onChange={(event) => setTopic(event.target.value)}>
          {TOPICS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <div className="mb-2 font-medium">Title</div>
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>

      <label className="block text-sm">
        <div className="mb-2 font-medium">Question or discussion prompt</div>
        <textarea
          className="field min-h-[220px]"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Describe what you are trying to understand or what practical support would help."
          required
        />
      </label>

      {message ? <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">{message}</div> : null}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Posting..." : "Create post"}
      </button>
    </form>
  );
}
