"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Role = "user" | "moderator" | "admin" | "doctor";

type AuthorProfile = {
  display_name: string | null;
  role: Role;
};

type ForumPostRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  profiles: AuthorProfile | null; // joined alias
};

function RoleBadge({ role }: { role: Role }) {
  if (role === "user") return null;

  const label = role === "doctor" ? "Doctor" : role === "moderator" ? "Moderator" : "Admin";

  return <span className="text-[10px] border rounded px-2 py-0.5">{label}</span>;
}

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
    // Transform the data to match ForumPostRow type
      const transformedData = data?.map(post => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      }));

      setPosts((transformedData ?? []) as ForumPostRow[]);
      setLoading(false);
    })();
  }, [supabase]);

  if (!userId) {
    return (
      <main className="p-6 space-y-3 max-w-3xl">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <div className="text-sm border rounded p-3">
          You must be logged in to view the forum.
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-4 max-w-3xl">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <Link className="border rounded px-3 py-2" href="/forum/new">
          New Post
        </Link>
      </header>

      {err && <div className="text-sm border rounded p-3">Error: {err}</div>}

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-sm opacity-70">No posts yet. Create the first one.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const author = p.profiles;
            const name = author?.display_name ?? "Unknown";
            const role = author?.role ?? "user";

            return (
              <Link
                key={p.id}
                href={`/forum/${p.id}`}
                className="block border rounded-lg p-4 hover:bg-black/5 transition"
              >
                <div className="font-medium">{p.title}</div>

                <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
                  <span>{name}</span>
                  <RoleBadge role={role} />
                </div>

                <div className="text-sm opacity-80 mt-2 line-clamp-2">{p.body}</div>

                <div className="text-xs opacity-60 mt-2">
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
