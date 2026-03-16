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

type ForumPostRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  profiles: AuthorProfile | null;
};

export default function ForumPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("forum_posts")
        .select("id,title,body,created_at, profiles!forum_posts_created_by_fkey(display_name,role)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setErr(error.message);
        setPosts([]);
        setLoading(false);
        return;
      }

      const transformedData = data?.map((post) => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
      }));

      setPosts((transformedData ?? []) as ForumPostRow[]);
      setLoading(false);
    })();
  }, [supabase]);

  if (!userId) {
    return (
      <main className="shell py-6 sm:py-10">
        <section className="panel max-w-3xl px-6 py-8 sm:px-8">
          <span className="eyebrow">Member forum</span>
          <h1 className="mt-4 text-3xl font-semibold">Sign in to view the forum</h1>
          <p className="mt-4 text-sm leading-6 muted">
            This area is already protected behind login, which gives you a strong foundation for a more
            private and subscription-friendly community experience later on.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell max-w-5xl space-y-6 py-6 sm:py-10">
      <section className="panel flex flex-col gap-6 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="eyebrow">Community support</span>
          <h1 className="mt-4 text-4xl font-semibold">Member forum</h1>
          <p className="mt-3 text-sm leading-6 muted">
            Conversations, support, and practical tips from people trying to feel better and eat with more
            confidence.
          </p>
        </div>
        <Link className="btn-primary" href="/forum/new">
          Start a new post
        </Link>
      </section>

      {err && <div className="panel px-5 py-4 text-sm">Error: {err}</div>}

      {loading ? (
        <div className="panel px-5 py-4 text-sm muted">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="panel px-5 py-4 text-sm muted">No posts yet. Create the first one.</div>
      ) : (
        <div className="grid gap-4">
          {posts.map((p) => {
            const author = p.profiles;
            const name = author?.display_name ?? "Unknown";
            const role = author?.role ?? "user";

            return (
              <Link
                key={p.id}
                href={`/forum/${p.id}`}
                className="panel block px-5 py-5 hover:-translate-y-0.5"
              >
                <div className="text-xl font-semibold">{p.title}</div>

                <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                  <span>{name}</span>
                  <RoleBadge role={role} />
                </div>

                <div className="mt-3 line-clamp-2 text-sm leading-6 muted">{p.body}</div>

                <div className="mt-4 text-xs opacity-60">
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
