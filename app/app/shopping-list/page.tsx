import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalizeIngredientKey } from "@/lib/recipes/helpers";
import { buildShoppingList } from "@/lib/recipes/shoppingList";
import CopyShoppingListButton from "./CopyShoppingListButton";

type FavoriteRow = {
  recipe_id: string;
};

type RecipeRow = {
  id: string;
  title: string;
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

function formatShoppingListLine(
  item: ReturnType<typeof buildShoppingList>[number],
  recipeTitlesById: Map<string, string>,
  sourceRecipeIds: string[]
) {
  const quantity = item.quantityNumeric != null ? item.quantityText : item.quantityText;
  const line = [quantity, item.unit, item.ingredientName].filter(Boolean).join(" ").trim();
  const titles = sourceRecipeIds.map((recipeId) => recipeTitlesById.get(recipeId)).filter(Boolean);
  return titles.length > 0 ? `${line} (${titles.join(", ")})` : line;
}

export default async function ShoppingListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="shell py-6 sm:py-10">
        <div className="panel px-5 py-4 text-sm">Please sign in to view your shopping list.</div>
      </main>
    );
  }

  const { data: favoriteRows } = await supabase
    .from("recipe_favorites")
    .select("recipe_id")
    .eq("user_id", user.id);

  const recipeIds = (favoriteRows ?? []).map((row: FavoriteRow) => row.recipe_id);

  if (recipeIds.length === 0) {
    return (
      <main className="shell max-w-4xl space-y-6 py-6 sm:py-10">
        <section className="panel px-6 py-8 sm:px-8">
          <span className="eyebrow">Shopping list</span>
          <h1 className="mt-4 text-4xl font-semibold">Start with saved recipes.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            Save a few favorite recipes first, and this page will turn their structured ingredients
            into a simple combined list.
          </p>
          <div className="mt-5">
            <Link href="/recipes" className="btn-primary">
              Browse recipes
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [{ data: recipes }, { data: ingredientRows }] = await Promise.all([
    supabase.from("recipes").select("id,title").in("id", recipeIds).eq("status", "published"),
    supabase
      .from("recipe_ingredients")
      .select("recipe_id,ingredient_name,item_name,unit,quantity_numeric,quantity_text,raw_text,raw_line")
      .in("recipe_id", recipeIds),
  ]);

  const recipeTitleMap = new Map(
    ((recipes ?? []) as RecipeRow[]).map((recipe) => [recipe.id, recipe.title])
  );

  const aggregated = buildShoppingList(
    ((ingredientRows ?? []) as IngredientRow[]).map((ingredient) => ({
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
    }))
  );

  const recipeIdsByKey = new Map<string, string[]>();
  for (const row of (ingredientRows ?? []) as IngredientRow[]) {
    const ingredientName =
      row.ingredient_name ?? row.item_name ?? row.raw_text ?? row.raw_line ?? "Ingredient";
    const key = `${normalizeIngredientKey(ingredientName)}__${row.unit?.toLowerCase().trim() ?? ""}`;
    recipeIdsByKey.set(key, [...(recipeIdsByKey.get(key) ?? []), row.recipe_id]);
  }

  const copyText = aggregated
    .map((item) =>
      formatShoppingListLine(item, recipeTitleMap, Array.from(new Set(recipeIdsByKey.get(item.key) ?? [])))
    )
    .join("\n");

  return (
    <main className="shell max-w-5xl space-y-6 py-6 sm:py-10">
      <section className="panel flex flex-col gap-5 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="eyebrow">Shopping list</span>
          <h1 className="mt-4 text-4xl font-semibold">Combined ingredients from your saved recipes.</h1>
          <p className="mt-3 text-sm leading-6 muted">
            This first version combines exact ingredient and unit matches from your saved recipe set.
            It keeps the logic practical now while setting up cleaner scaling later.
          </p>
        </div>
        <CopyShoppingListButton text={copyText} />
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="mb-4 text-sm font-semibold">Saved recipes included</div>
        <div className="flex flex-wrap gap-2">
          {Array.from(recipeTitleMap.values()).map((title) => (
            <span
              key={title}
              className="rounded-full border border-[var(--border)] bg-white/72 px-3 py-2 text-sm"
            >
              {title}
            </span>
          ))}
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="mb-4 text-sm font-semibold">Generated list</div>
        {aggregated.length === 0 ? (
          <div className="text-sm muted">No structured ingredients are available in your saved recipes yet.</div>
        ) : (
          <ul className="space-y-3">
            {aggregated.map((item) => {
              const recipeTitles = Array.from(new Set(recipeIdsByKey.get(item.key) ?? []))
                .map((recipeId) => recipeTitleMap.get(recipeId))
                .filter(Boolean);

              return (
                <li
                  key={item.key}
                  className="flex flex-col gap-1 rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4"
                >
                  <span className="font-medium">
                    {[item.quantityText, item.unit, item.ingredientName].filter(Boolean).join(" ")}
                  </span>
                  <span className="text-sm muted">
                    {recipeTitles.length > 0 ? `Used in ${recipeTitles.join(", ")}` : "Saved recipe ingredient"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
