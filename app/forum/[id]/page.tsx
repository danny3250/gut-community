"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Role = "user" | "moderator" | "admin" | "doctor";

type AuthorProfile = {
  display_name: string | null;
  role: Role;
};

type PostRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  profiles: AuthorProfile | null;
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  created_by: string;
  profiles: AuthorProfile | null;
};

function RoleBadge({ role }: { role: Role }) {
  if (role === "user") return null;

  const label = role === "doctor" ? "Doctor" : role === "moderator" ? "Moderator" : "Admin";

  return <span className="text-[10px] border rounded px-2 py-0.5">{label}</span>;
}

export default function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);

  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);

  const [commentText, setCommentText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const p = await params;
      setPostId(p.id);
    })();
  }, [params]);

  async function loadAll(id: string) {
    setLoading(true);
    setMsg(null);

    // --- POST ---
    const { data: p, error: pErr } = await supabase
        .from("forum_posts")
        .select("id,title,body,created_at, profiles!forum_posts_created_by_fkey(display_name,role)")
        .eq("id", id)
        .single();


    if (pErr || !p) {
        setPost(null);
        setComments([]);
        setLoading(false);
        setMsg(pErr?.message ?? "Post not found.");
        return;
    }

    // Normalize profiles (can come back as object OR array depending on relationship inference)
    const rawPProfile = (p as any).profiles;
    const postProfile = Array.isArray(rawPProfile)
        ? (rawPProfile[0] ?? null)
        : (rawPProfile ?? null);

    const normalizedPost: PostRow = {
        id: (p as any).id,
        title: (p as any).title,
        body: (p as any).body,
        created_at: (p as any).created_at,
        profiles: postProfile,
    };

    setPost(normalizedPost); // ✅ this replaces setPost(p as PostRow)

    // --- COMMENTS ---
    const { data: c, error: cErr } = await supabase
        .from("forum_comments")
        .select("id,body,created_at,created_by, profiles!forum_comments_created_by_fkey(display_name,role)")
        .eq("post_id", id)
        .order("created_at", { ascending: true });


    if (cErr) setMsg(cErr.message);

    const normalizedComments: CommentRow[] = (c ?? []).map((row: any) => {
        const rawCProfile = row.profiles;
        const commentProfile = Array.isArray(rawCProfile)
        ? (rawCProfile[0] ?? null)
        : (rawCProfile ?? null);

        return {
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        created_by: row.created_by,
        profiles: commentProfile,
        };
    });

    setComments(normalizedComments);

    setLoading(false);
    }


  useEffect(() => {
    if (!postId) return;
    loadAll(postId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function ensureDisplayName(currentUserId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", currentUserId)
      .single();

    if (error) return false;
    return !!data?.display_name;
  }

  async function addComment() {
    if (!postId) return;

    const text = commentText.trim();
    if (!text) return;

    setPosting(true);
    setMsg(null);

    if (!userId) {
      setPosting(false);
      setMsg("Not logged in.");
      return;
    }

    const ok = await ensureDisplayName(userId);
    if (!ok) {
      setPosting(false);
      window.location.href = "/settings/profile";
      return;
    }

    const { error } = await supabase
      .from("forum_comments")
      .insert({ post_id: postId, created_by: userId, body: text });

    setPosting(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setCommentText("");
    loadAll(postId);
  }

  if (!userId) {
    return (
      <main className="p-6 space-y-3 max-w-3xl">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <div className="text-sm border rounded p-3">
          You must be logged in to view posts.
        </div>
        <Link className="underline" href="/login">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-3xl space-y-4">
      <Link href="/forum" className="text-sm opacity-70 hover:opacity-100">
        ← Back to Forum
      </Link>

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : !post ? (
        <div className="text-sm border rounded p-3">{msg ?? "Post not found."}</div>
      ) : (
        <>
          <article className="border rounded-lg p-4">
            <h1 className="text-2xl font-semibold">{post.title}</h1>

            <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
              <span>{post.profiles?.display_name ?? "Unknown"}</span>
              <RoleBadge role={post.profiles?.role ?? "user"} />
            </div>

            <div className="text-xs opacity-60 mt-2">
              {new Date(post.created_at).toLocaleString()}
            </div>

            <div className="mt-4 whitespace-pre-wrap">{post.body}</div>
          </article>

          <section className="border rounded-lg p-4 space-y-3">
            <div className="font-medium">Comments</div>

            {comments.length === 0 ? (
              <div className="text-sm opacity-70">No comments yet.</div>
            ) : (
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="border rounded p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs opacity-70 flex items-center gap-2">
                        <span>{c.profiles?.display_name ?? "Unknown"}</span>
                        <RoleBadge role={c.profiles?.role ?? "user"} />
                      </div>
                      <div className="text-xs opacity-60">
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap mt-2">{c.body}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 space-y-2">
              <textarea
                className="w-full border rounded p-2 min-h-[100px]"
                placeholder="Write a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />

              <button
                className="border rounded px-3 py-2"
                type="button"
                onClick={addComment}
                disabled={posting}
              >
                {posting ? "Posting…" : "Add Comment"}
              </button>

              {msg && <div className="text-sm border rounded p-3">{msg}</div>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
