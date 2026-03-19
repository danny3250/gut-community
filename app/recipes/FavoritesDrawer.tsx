"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AddToShoppingListButton from "./AddToShoppingListButton";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelected(recipeId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  }

  function printSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    onClose();
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.src = `/recipes/print?recipes=${ids.join(",")}`;

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 400);
    };

    iframe.onload = () => {
      window.setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          cleanup();
        }
      }, 180);
    };

    document.body.appendChild(iframe);
  }

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());

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

        {recipes.length > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="text-sm muted">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select recipes to print"}
            </div>
            <button
              type="button"
              onClick={printSelected}
              disabled={selectedIds.size === 0}
              className={selectedIds.size === 0 ? "btn-secondary px-4 py-2 text-sm opacity-50" : "btn-secondary px-4 py-2 text-sm"}
            >
              Print selected
            </button>
          </div>
        ) : null}

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
              <div key={recipe.id} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(recipe.id)}
                    onChange={() => toggleSelected(recipe.id)}
                    className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                    aria-label={`Select ${recipe.name ?? recipe.title ?? "recipe"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/recipes/${recipe.slug ?? fallbackSlug(recipe.name ?? recipe.title ?? recipe.id)}`}
                      onClick={onClose}
                      className="block transition hover:bg-black/5"
                    >
                      <div className="font-medium">{recipe.name ?? recipe.title ?? "Recipe"}</div>
                      {recipe.summary ?? recipe.description ? (
                        <div className="mt-1 line-clamp-2 text-sm opacity-80">
                          {recipe.summary ?? recipe.description}
                        </div>
                      ) : null}
                    </Link>
                  </div>
                </div>
                <div className="mt-3">
                  <AddToShoppingListButton recipeId={recipe.id} className="btn-secondary inline-flex px-4 py-2 text-sm" />
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
