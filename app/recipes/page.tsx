"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FavoritesDrawer from "./FavoritesDrawer";
import SaveToggle from "./SaveToggle";

type Tag = { id: string; name: string };

type RecipeRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  status: "draft" | "published" | string;
  created_by?: string;
};

export default function RecipesPage() {
  const supabase = createClient();

  // Tabs
  const [tab, setTab] = useState<"published" | "drafts">("published");

  // User + favorites
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favOpen, setFavOpen] = useState(false);

  // Tags + filter (published tab only)
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  // Data
  const [published, setPublished] = useState<RecipeRow[]>([]);
  const [drafts, setDrafts] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  function toggleTag(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 1) Load user (client session)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, [supabase]);

  // 2) Load tags (for published filters)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("recipe_tags")
        .select("id,name")
        .order("name");

      if (!error && data) setTags(data as Tag[]);
    })();
  }, [supabase]);

  // 3) Load favorites (published tab star state)
  async function refreshFavorites(currentUserId?: string | null) {
    const id = currentUserId ?? userId;
    if (!id) {
      setFavoriteIds(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("user_id", id);

    if (error) return;

    const ids = new Set(
      (data ?? [])
        .map((r) => (r as any).recipe_id as string)
        .filter((x) => typeof x === "string" && x.length > 0)
    );

    setFavoriteIds(ids);
  }

  useEffect(() => {
    refreshFavorites(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 4) Load drafts (only yours)
  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,title,description,created_at,status,created_by")
        .eq("status", "draft")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (!error) setDrafts((data ?? []) as RecipeRow[]);
    })();
  }, [supabase, userId]);

  // 5) Load published recipes (with optional tag filtering)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      // No tags selected => load published directly
      if (selectedIds.length === 0) {
        const { data, error } = await supabase
          .from("recipes")
          .select("id,title,description,created_at,status")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) setErr(error.message);
        setPublished((data ?? []) as RecipeRow[]);
        setLoading(false);
        return;
      }

      // Tag filter => match ANY selected tag
      const { data: mapRows, error: mapErr } = await supabase
        .from("recipe_tag_map")
        .select("recipe_id, tag_id")
        .in("tag_id", selectedIds);

      if (mapErr) {
        setErr(mapErr.message);
        setPublished([]);
        setLoading(false);
        return;
      }

      const counts = new Map<string, number>();
      for (const row of mapRows ?? []) {
        const rid = (row as any).recipe_id as string;
        if (!rid) continue;
        counts.set(rid, (counts.get(rid) ?? 0) + 1);
      }

      const matchingRecipeIds = Array.from(counts.entries())
        .filter(([, c]) => c >= 1) // ✅ ANY-match
        .map(([recipe_id]) => recipe_id);

      if (matchingRecipeIds.length === 0) {
        setPublished([]);
        setLoading(false);
        return;
      }

      const { data: recipesData, error: recipesErr } = await supabase
        .from("recipes")
        .select("id,title,description,created_at,status")
        .eq("status", "published")
        .in("id", matchingRecipeIds)
        .order("created_at", { ascending: false });

      if (recipesErr) setErr(recipesErr.message);
      setPublished((recipesData ?? []) as RecipeRow[]);
      setLoading(false);
    })();
  }, [supabase, selectedIds]);

  const visible = tab === "published" ? published : drafts;

  return (
    <main className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Recipes</h1>

        <div className="flex gap-2">
          {tab === "published" && (
            <button
              className="border rounded px-3 py-2"
              type="button"
              onClick={() => setFavOpen(true)}
            >
              ★ Favorites
            </button>
          )}

          <Link className="border rounded px-3 py-2" href="/recipes/new">
            Add Recipe
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setTab("published")}
          className={`px-3 py-1 rounded-t border ${
            tab === "published" ? "bg-white border-b-0" : "opacity-70"
          }`}
        >
          Published
        </button>

        <button
          type="button"
          onClick={() => setTab("drafts")}
          className={`px-3 py-1 rounded-t border ${
            tab === "drafts" ? "bg-white border-b-0" : "opacity-70"
          }`}
        >
          Drafts
        </button>
      </div>

      {/* Filters (Published only) */}
      {tab === "published" && (
        <section className="space-y-2">
          <div className="font-medium">Filter by tags</div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const checked = selected.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`border rounded-full px-3 py-1 text-sm transition ${
                    checked ? "bg-black text-white" : "hover:bg-black/5"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}

            {selected.size > 0 && (
              <button
                type="button"
                className="border rounded-full px-3 py-1 text-sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </button>
            )}
          </div>
        </section>
      )}

      {err && <div className="text-sm">Error: {err}</div>}

      {/* List */}
      {loading && tab === "published" ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="text-sm opacity-70">
          {tab === "published"
            ? "No published recipes match those tags yet."
            : "You have no drafts yet."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <div key={r.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {tab === "published" ? (
                    <Link href={`/recipes/${r.id}`}>
                      <div className="font-medium">{r.title}</div>
                      {r.description && (
                        <div className="text-sm opacity-80 mt-1 line-clamp-2">
                          {r.description}
                        </div>
                      )}
                    </Link>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{r.title}</div>
                        <span className="text-xs border rounded px-2 py-0.5">
                          Draft
                        </span>
                      </div>

                      {r.description && (
                        <div className="text-sm opacity-80 mt-1 line-clamp-2">
                          {r.description}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Link
                          className="border rounded px-2 py-1 text-sm"
                          href={`/recipes/${r.id}/edit`}
                        >
                          Edit
                        </Link>
                        <Link
                          className="border rounded px-2 py-1 text-sm"
                          href={`/recipes/${r.id}/review`}
                        >
                          Review
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                {/* Save toggle only on published */}
                {tab === "published" ? (
                  <SaveToggle
                    recipeId={r.id}
                    userId={userId}
                    isSaved={favoriteIds.has(r.id)}
                    onChanged={() => refreshFavorites()}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer only makes sense on published tab */}
      {tab === "published" && (
        <FavoritesDrawer open={favOpen} onClose={() => setFavOpen(false)} />
      )}
    </main>
  );
}
