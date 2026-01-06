"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NewForumPostPage() {
  const supabase = createClient();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setLoading(false);
      setMsg("Not logged in.");
      return;
    }

    const { data, error } = await supabase
      .from("forum_posts")
      .insert({ created_by: userId, title, body })
      .select("id")
      .single();

    if (error || !data) {
      setLoading(false);
      setMsg(error?.message ?? "Failed to create post.");
      return;
    }

    setLoading(false);
    router.push(`/forum/${data.id}`);
  }

  return (
    <main className="p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">New Post</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          className="w-full border rounded p-2 min-h-[200px]"
          placeholder="Write your post…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />

        <button className="border rounded px-3 py-2" disabled={loading} type="submit">
          {loading ? "Posting…" : "Post"}
        </button>

        {msg && <div className="text-sm border rounded p-3">{msg}</div>}
      </form>
    </main>
  );
}
