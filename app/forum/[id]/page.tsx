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
  provider: ProviderProfile | null;
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

type ProviderProfile = {
  id: string;
  user_id: string;
  slug: string | null;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  states_served: string[] | null;
  verification_status: string | null;
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
  const [currentUserProvider, setCurrentUserProvider] = useState<ProviderProfile | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const resolvedUserId = data.user?.id ?? null;
      setUserId(resolvedUserId);

      if (!resolvedUserId) {
        setCurrentUserProvider(null);
        return;
      }

      const { data: providerData } = await supabase
        .from("providers")
        .select("id,user_id,slug,display_name,credentials,specialty,states_served,verification_status")
        .eq("user_id", resolvedUserId)
        .eq("verification_status", "verified")
        .maybeSingle();

      setCurrentUserProvider((providerData as ProviderProfile | null) ?? null);
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

    const providerUserIds = Array.from(
      new Set(((commentData ?? []) as RawComment[]).map((row) => row.created_by).filter(Boolean))
    );
    const providerMap = new Map<string, ProviderProfile>();

    if (providerUserIds.length > 0) {
      const { data: providerRows } = await supabase
        .from("providers")
        .select("id,user_id,slug,display_name,credentials,specialty,states_served,verification_status")
        .in("user_id", providerUserIds)
        .eq("verification_status", "verified");

      for (const provider of (providerRows ?? []) as ProviderProfile[]) {
        providerMap.set(provider.user_id, provider);
      }
    }

    const normalizedComments: CommentRow[] = (commentData ?? []).map((row: RawComment) => {
      const rawProfile = row.profiles;
      return {
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        created_by: row.created_by,
        profiles: Array.isArray(rawProfile) ? (rawProfile[0] ?? null) : (rawProfile ?? null),
        provider: providerMap.get(row.created_by) ?? null,
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
              <RoleBadge role={post.profiles?.role ?? "patient"} />
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
                {comments.map((comment) => {
                  const provider = comment.provider;
                  const isVerifiedProvider = provider?.verification_status === "verified";

                  return (
                    <div
                      key={comment.id}
                      className={`rounded-[24px] border p-4 ${
                        isVerifiedProvider
                          ? "border-[rgba(31,77,57,0.24)] bg-[rgba(220,239,227,0.42)]"
                          : "border-[var(--border)] bg-white/65"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
                            <span>{isVerifiedProvider ? provider.display_name : comment.profiles?.display_name ?? "Unknown"}</span>
                            {isVerifiedProvider ? (
                              <span className="rounded-full bg-white/90 px-2.5 py-1 font-semibold text-[var(--accent-strong)]">
                                Verified Provider
                              </span>
                            ) : (
                              <RoleBadge role={comment.profiles?.role ?? "patient"} />
                            )}
                          </div>
                          {isVerifiedProvider ? (
                            <div className="mt-2 text-sm leading-6 muted">
                              {[provider.credentials, provider.specialty].filter(Boolean).join(" | ")}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-xs opacity-60">
                          {new Date(comment.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="mt-3 whitespace-pre-wrap text-sm leading-6">{comment.body}</div>

                      {isVerifiedProvider && provider.slug ? (
                        <div className="mt-4 rounded-[22px] border border-[rgba(31,77,57,0.12)] bg-white/78 px-4 py-4">
                          <div className="flex flex-wrap gap-3">
                            <Link href={`/providers/${provider.slug}`} className="btn-primary px-4 py-2 text-sm">
                              Book an appointment with this provider
                            </Link>
                            <Link href={`/providers/${provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
                              View provider profile
                            </Link>
                          </div>
                          <p className="mt-3 text-xs leading-5 muted">
                            This response is for informational purposes and does not replace professional medical advice.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3 pt-2">
              {currentUserProvider ? (
                <div className="rounded-[22px] border border-[rgba(31,77,57,0.16)] bg-[rgba(220,239,227,0.38)] px-4 py-3 text-sm muted">
                  Your reply will appear with your verified provider identity and link back to your CareBridge profile.
                </div>
              ) : null}

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
