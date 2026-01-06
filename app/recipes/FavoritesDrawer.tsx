"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RecipeRow = { id: string; title: string; description: string | null };

export default function FavoritesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        setRecipes([]);
        setLoading(false);
        setErr("Not logged in.");
        return;
      }

      // 1) Get favorite recipe ids
      const { data: favRows, error: favErr } = await supabase
        .from("recipe_favorites")
        .select("recipe_id")
        .eq("user_id", userId);

      if (favErr) {
        setErr(favErr.message);
        setRecipes([]);
        setLoading(false);
        return;
      }

      const ids = (favRows ?? [])
        .map((r) => r.recipe_id as string)
        .filter(Boolean);

      if (ids.length === 0) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      // 2) Fetch recipes by those ids
      const { data: recipeRows, error: recipeErr } = await supabase
        .from("recipes")
        .select("id,title,description")
        .in("id", ids)
        .order("created_at", { ascending: false });

      if (recipeErr) {
        setErr(recipeErr.message);
        setRecipes([]);
        setLoading(false);
        return;
      }

      setRecipes((recipeRows ?? []) as RecipeRow[]);
      setLoading(false);
    })();
  }, [open, supabase]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* panel */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl p-4 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">★ Favorites</h2>
          <button className="border rounded px-3 py-1" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-auto space-y-2">
          {err && <div className="text-sm">Error: {err}</div>}

          {loading ? (
            <div className="text-sm opacity-70">Loading…</div>
          ) : recipes.length === 0 ? (
            <div className="text-sm opacity-70">
              No saved recipes yet. Click ☆ Save on a recipe to add it here.
            </div>
          ) : (
            recipes.map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                onClick={onClose}
                className="block border rounded-lg p-3 hover:bg-black/5 transition"
              >
                <div className="font-medium">{r.title}</div>
                {r.description && (
                  <div className="text-sm opacity-80 mt-1 line-clamp-2">
                    {r.description}
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
