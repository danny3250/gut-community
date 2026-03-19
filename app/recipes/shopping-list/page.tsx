"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeIngredientKey } from "@/lib/recipes/helpers";
import { buildShoppingList } from "@/lib/recipes/shoppingList";
import ShoppingListActions from "../ShoppingListActions";
import {
  clearShoppingListRecipeIds,
  readShoppingListEntries,
  setRecipeQuantity,
  type ShoppingListRecipeEntry,
} from "../shoppingCart";

type RecipeRow = {
  id: string;
  slug: string | null;
  title: string | null;
};

type IngredientRow = {
  recipe_id: string;
  ingredient_name: string | null;
  item_name: string | null;
  unit: string | null;
  quantity_numeric: number | null;
  quantity_text: string | null;
  raw_text: string | null;
  raw_line: string | null;
};

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export default function RecipesShoppingListPage() {
  const supabase = createClient();
  const [shoppingListEntries, setShoppingListEntries] = useState<ShoppingListRecipeEntry[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncEntries = () => setShoppingListEntries(readShoppingListEntries());
    syncEntries();

    window.addEventListener("carebridge-shopping-list-updated", syncEntries as EventListener);
    window.addEventListener("storage", syncEntries);

    return () => {
      window.removeEventListener("carebridge-shopping-list-updated", syncEntries as EventListener);
      window.removeEventListener("storage", syncEntries);
    };
  }, []);

  const recipeIds = useMemo(() => shoppingListEntries.map((entry) => entry.recipeId), [shoppingListEntries]);
  const quantityMap = useMemo(
    () => new Map(shoppingListEntries.map((entry) => [entry.recipeId, entry.quantity])),
    [shoppingListEntries]
  );

  useEffect(() => {
    if (recipeIds.length === 0) {
      setRecipes([]);
      setIngredients([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErrorMessage(null);

      const [{ data: recipeRows, error: recipeError }, { data: ingredientRows, error: ingredientError }] = await Promise.all([
        supabase.from("recipes").select("id,slug,title").in("id", recipeIds).eq("status", "published"),
        supabase
          .from("recipe_ingredients")
          .select("recipe_id,ingredient_name,item_name,unit,quantity_numeric,quantity_text,raw_text,raw_line")
          .in("recipe_id", recipeIds),
      ]);

      if (recipeError || ingredientError) {
        setErrorMessage(recipeError?.message ?? ingredientError?.message ?? "Could not load shopping list.");
        setRecipes([]);
        setIngredients([]);
        setLoading(false);
        return;
      }

      setRecipes((recipeRows ?? []) as RecipeRow[]);
      setIngredients((ingredientRows ?? []) as IngredientRow[]);
      setLoading(false);
    })();
  }, [recipeIds, supabase]);

  const recipeTitles = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe.title ?? "Recipe"])),
    [recipes]
  );

  const aggregated = useMemo(
    () =>
      buildShoppingList(
        ingredients.flatMap((ingredient) => {
          const quantity = quantityMap.get(ingredient.recipe_id) ?? 1;
          return Array.from({ length: quantity }, () => ({
            ingredientName:
              ingredient.ingredient_name ??
              ingredient.item_name ??
              ingredient.raw_text ??
              ingredient.raw_line ??
              "Ingredient",
            unit: ingredient.unit,
            quantityNumeric: ingredient.quantity_numeric,
            quantityText: ingredient.quantity_text,
            rawText: ingredient.raw_text ?? ingredient.raw_line ?? "Ingredient",
          }));
        })
      ),
    [ingredients, quantityMap]
  );

  const recipeIdsByKey = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of ingredients) {
      const ingredientName =
        row.ingredient_name ?? row.item_name ?? row.raw_text ?? row.raw_line ?? "Ingredient";
      const key = `${normalizeIngredientKey(ingredientName)}__${row.unit?.toLowerCase().trim() ?? ""}`;
      const quantity = quantityMap.get(row.recipe_id) ?? 1;
      map.set(key, [...(map.get(key) ?? []), ...Array.from({ length: quantity }, () => row.recipe_id)]);
    }
    return map;
  }, [ingredients, quantityMap]);

  const copyText = useMemo(
    () =>
      aggregated
        .map((item) => {
          const relatedTitles = Array.from(new Set(recipeIdsByKey.get(item.key) ?? []))
            .map((recipeId) => recipeTitles.get(recipeId))
            .filter(Boolean);
          const line = [item.quantityText, item.unit, item.ingredientName].filter(Boolean).join(" ").trim();
          return relatedTitles.length > 0 ? `${line} (${relatedTitles.join(", ")})` : line;
        })
        .join("\n"),
    [aggregated, recipeIdsByKey, recipeTitles]
  );

  const shareUrl = `${getBaseUrl()}/recipes/shopping-list`;

  return (
    <main className="shell recipe-shopping-list-page space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="workspace-section print:!border-0 print:pt-0">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow">Shopping list</span>
            <h1 className="mt-4 text-4xl font-semibold">Combined ingredients from your selected recipes.</h1>
            <p className="mt-4 text-base leading-7 muted">
              Add recipes from the recipes page or Favorites drawer, then use this list to shop, print, copy, or share with someone helping you prepare.
            </p>
          </div>
          <div className="recipe-shopping-list-actions flex flex-wrap gap-3">
            <ShoppingListActions copyText={copyText} shareUrl={shareUrl} />
            {recipeIds.length > 0 ? (
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => clearShoppingListRecipeIds()}>
                Clear list
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="workspace-section text-sm muted">Loading shopping list...</section>
      ) : recipeIds.length === 0 ? (
        <section className="workspace-section">
          <h2 className="text-2xl font-semibold">Your shopping list is empty.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            Add recipes to the shopping list from the recipes page or from your saved favorites, then come back here for the combined ingredient view.
          </p>
          <div className="mt-6">
            <Link href="/recipes" className="btn-primary">
              Browse recipes
            </Link>
          </div>
        </section>
      ) : errorMessage ? (
        <section className="workspace-section text-sm">{errorMessage}</section>
      ) : (
        <>
          <section className="workspace-section print:!border-0 print:pt-0">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Recipes included</div>
            <div className="mt-5 flex flex-wrap gap-2 print:mt-3">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="recipe-shopping-list-recipe inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/72 px-3 py-2 text-sm"
                >
                  <Link href={`/recipes/${recipe.slug ?? recipe.id}`}>{recipe.title ?? "Recipe"}</Link>
                  <button
                    type="button"
                    className="recipe-shopping-list-adjust inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] text-sm"
                    onClick={() => setRecipeQuantity(recipe.id, (quantityMap.get(recipe.id) ?? 1) - 1)}
                  >
                    -
                  </button>
                  <span className="min-w-5 text-center font-semibold">{quantityMap.get(recipe.id) ?? 1}</span>
                  <button
                    type="button"
                    className="recipe-shopping-list-adjust inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] text-sm"
                    onClick={() => setRecipeQuantity(recipe.id, (quantityMap.get(recipe.id) ?? 1) + 1)}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-section print:!border-0 print:pt-0">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Generated list</div>
            {aggregated.length === 0 ? (
              <div className="mt-5 text-sm muted">No structured ingredients are available for the recipes currently in your list.</div>
            ) : (
              <div className="mt-5 grid gap-3">
                {aggregated.map((item) => {
                  const relatedTitles = Array.from(new Set(recipeIdsByKey.get(item.key) ?? []))
                    .map((recipeId) => recipeTitles.get(recipeId))
                    .filter(Boolean);
                  return (
                    <div key={item.key} className="data-row first:border-t-0">
                      <div className="text-lg font-semibold">
                        {[item.quantityText, item.unit, item.ingredientName].filter(Boolean).join(" ")}
                      </div>
                      <div className="mt-2 text-sm leading-6 muted">
                        {relatedTitles.length > 0 ? `Used in ${relatedTitles.join(", ")}` : "Selected recipe ingredient"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
