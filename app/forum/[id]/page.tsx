// ROLE NOTES:
// - Role names + labels live in: lib/auth/roles.ts
// - DB source: public.profiles.role (string)
// - Only admin has elevated privileges right now

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Role } from "@/lib/auth/roles";
import { RoleBadge } from "@/app/components/RoleBadge";

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

type RawPost = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  profiles: AuthorProfile | AuthorProfile[] | null;
};

type RawComment = {
  id: string;
  body: string;
  created_at: string;
  created_by: string;
  profiles: AuthorProfile | AuthorProfile[] | null;
};

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
      const resolved = await params;
      setPostId(resolved.id);
    })();
  }, [params]);

  async function loadAll(id: string) {
    setLoading(true);
    setMsg(null);

    const { data: postData, error: postError } = await supabase
      .from("forum_posts")
      .select("id,title,body,created_at, profiles!forum_posts_created_by_fkey(display_name,role)")
      .eq("id", id)
      .single();

    if (postError || !postData) {
      setPost(null);
      setComments([]);
      setLoading(false);
      setMsg(postError?.message ?? "Post not found.");
      return;
    }

    const rawPostProfile = (postData as RawPost).profiles;
    const normalizedPost: PostRow = {
      id: (postData as RawPost).id,
      title: (postData as RawPost).title,
      body: (postData as RawPost).body,
      created_at: (postData as RawPost).created_at,
      profiles: Array.isArray(rawPostProfile) ? (rawPostProfile[0] ?? null) : (rawPostProfile ?? null),
    };
    setPost(normalizedPost);

    const { data: commentData, error: commentError } = await supabase
      .from("forum_comments")
      .select("id,body,created_at,created_by, profiles!forum_comments_created_by_fkey(display_name,role)")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (commentError) setMsg(commentError.message);

    const normalizedComments: CommentRow[] = (commentData ?? []).map((row: RawComment) => {
      const rawProfile = row.profiles;
      return {
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        created_by: row.created_by,
        profiles: Array.isArray(rawProfile) ? (rawProfile[0] ?? null) : (rawProfile ?? null),
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

    const hasDisplayName = await ensureDisplayName(userId);
    if (!hasDisplayName) {
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
      <main className="shell py-6 sm:py-10">
        <section className="panel max-w-3xl space-y-4 px-6 py-8 sm:px-8">
          <h1 className="text-3xl font-semibold">Forum</h1>
          <div className="text-sm leading-6 muted">You must be logged in to view posts.</div>
          <Link className="btn-primary" href="/login">
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell max-w-4xl space-y-6 py-6 sm:py-10">
      <Link href="/forum" className="text-sm muted hover:text-[var(--foreground)]">
        Back to forum
      </Link>

      {loading ? (
        <div className="panel px-5 py-4 text-sm muted">Loading...</div>
      ) : !post ? (
        <div className="panel px-5 py-4 text-sm">{msg ?? "Post not found."}</div>
      ) : (
        <>
          <article className="panel px-6 py-6">
            <h1 className="text-3xl font-semibold">{post.title}</h1>

            <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
              <span>{post.profiles?.display_name ?? "Unknown"}</span>
              <RoleBadge role={post.profiles?.role ?? "user"} />
            </div>

            <div className="mt-2 text-xs opacity-60">
              {new Date(post.created_at).toLocaleString()}
            </div>

            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 sm:text-base">{post.body}</div>
          </article>

          <section className="panel space-y-4 px-6 py-6">
            <div className="font-medium">Comments</div>

            {comments.length === 0 ? (
              <div className="text-sm muted">No comments yet.</div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-[24px] border border-[var(--border)] bg-white/65 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        <span>{comment.profiles?.display_name ?? "Unknown"}</span>
                        <RoleBadge role={comment.profiles?.role ?? "user"} />
                      </div>
                      <div className="text-xs opacity-60">
                        {new Date(comment.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.body}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <textarea
                className="field min-h-[120px]"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />

              <button className="btn-primary" type="button" onClick={addComment} disabled={posting}>
                {posting ? "Posting..." : "Add comment"}
              </button>

              {msg && <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{msg}</div>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
