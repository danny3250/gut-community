"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RecipeRow = {
  id: string;
  slug: string | null;
  title: string | null;
  name: string | null;
  description: string | null;
  summary: string | null;
};

function fallbackSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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
        .map((row) => row.recipe_id as string)
        .filter(Boolean);

      if (ids.length === 0) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      const { data: recipeRows, error: recipeErr } = await supabase
        .from("recipes")
        .select("id,slug,title,name,description,summary")
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved recipes</h2>
          <button className="rounded border px-3 py-1" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-auto">
          {err ? <div className="text-sm">Error: {err}</div> : null}

          {loading ? (
            <div className="text-sm opacity-70">Loading...</div>
          ) : recipes.length === 0 ? (
            <div className="text-sm opacity-70">
              No saved recipes yet. Use Save on a recipe card to keep it here.
            </div>
          ) : (
            recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.slug ?? fallbackSlug(recipe.name ?? recipe.title ?? recipe.id)}`}
                onClick={onClose}
                className="block rounded-lg border p-3 transition hover:bg-black/5"
              >
                <div className="font-medium">{recipe.name ?? recipe.title ?? "Recipe"}</div>
                {recipe.summary ?? recipe.description ? (
                  <div className="mt-1 line-clamp-2 text-sm opacity-80">
                    {recipe.summary ?? recipe.description}
                  </div>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
