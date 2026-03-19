import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { splitInstructionText } from "@/lib/recipes/helpers";
import { formatRecipeFacetLabel } from "@/lib/carebridge/recipes";
import PrintRecipeActions from "./PrintRecipeActions";

type RecipesPrintPageProps = {
  searchParams: Promise<{ recipes?: string }>;
};

type RecipeRow = {
  id: string;
  slug: string | null;
  title: string | null;
  name: string | null;
  summary: string | null;
  description: string | null;
  ingredients_raw: string | null;
  instructions_raw: string | null;
  ingredients: string | null;
  instructions: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  notes: string | null;
  why_this_helps: string | null;
  tags: string[] | null;
  status: string;
};

type IngredientRow = {
  recipe_id: string;
  sort_order: number | null;
  raw_text: string | null;
  raw_line: string | null;
  quantity_text: string | null;
  unit: string | null;
  ingredient_name: string | null;
  item_name: string | null;
  preparation_note: string | null;
  notes: string | null;
  optional_flag: boolean | null;
};

type StepRow = {
  recipe_id: string;
  step_number: number;
  body: string;
};

function splitLines(block: string | null) {
  return (block ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatIngredient(row: IngredientRow) {
  const quantity = row.quantity_text?.trim();
  const unit = row.unit?.trim();
  const name =
    row.ingredient_name?.trim() ||
    row.item_name?.trim() ||
    row.raw_text?.trim() ||
    row.raw_line?.trim() ||
    "";
  const note = row.preparation_note?.trim() || row.notes?.trim();
  const optional = row.optional_flag ? "optional" : null;
  const suffix = [note, optional].filter(Boolean).join(", ");
  return [quantity, unit, name].filter(Boolean).join(" ") + (suffix ? `, ${suffix}` : "");
}

function formatMinutes(value: number | null | undefined) {
  if (value == null) return null;
  return `${value} min`;
}

export default async function RecipesPrintPage({ searchParams }: RecipesPrintPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const recipeIds = Array.from(
    new Set(
      (resolvedSearchParams.recipes ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

  if (recipeIds.length === 0) {
    return (
      <main className="shell recipe-print-page space-y-8 py-6 sm:space-y-10 sm:py-10">
        <section className="workspace-section">
          <h1 className="text-3xl font-semibold">Select recipes to print.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            Choose a few recipes from Favorites, then open the print view to get a clean recipe packet with ingredients and steps.
          </p>
          <div className="recipe-print-actions mt-6">
            <Link href="/recipes" className="btn-primary">
              Back to recipes
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [{ data: recipes, error: recipesError }, { data: ingredientRows, error: ingredientsError }, { data: stepRows, error: stepsError }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select(
          "id,slug,title,name,summary,description,ingredients_raw,instructions_raw,ingredients,instructions,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,difficulty,notes,why_this_helps,tags,status"
        )
        .in("id", recipeIds)
        .eq("status", "published"),
      supabase
        .from("recipe_ingredients")
        .select("recipe_id,sort_order,raw_text,raw_line,quantity_text,unit,ingredient_name,item_name,preparation_note,notes,optional_flag")
        .in("recipe_id", recipeIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("recipe_steps")
        .select("recipe_id,step_number,body")
        .in("recipe_id", recipeIds)
        .order("step_number", { ascending: true }),
    ]);

  if (recipesError) throw recipesError;
  if (ingredientsError) throw ingredientsError;
  if (stepsError) throw stepsError;

  const ingredientMap = new Map<string, string[]>();
  for (const row of (ingredientRows ?? []) as IngredientRow[]) {
    ingredientMap.set(row.recipe_id, [...(ingredientMap.get(row.recipe_id) ?? []), formatIngredient(row)]);
  }

  const stepMap = new Map<string, string[]>();
  for (const row of (stepRows ?? []) as StepRow[]) {
    stepMap.set(row.recipe_id, [...(stepMap.get(row.recipe_id) ?? []), row.body]);
  }

  return (
    <main className="shell recipe-print-page space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="recipe-print-intro workspace-section">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow">Recipe print view</span>
            <h1 className="mt-4 text-4xl font-semibold">Selected recipes, ready to print.</h1>
            <p className="mt-3 text-base leading-7 muted">
              This print view keeps the recipes themselves front and center so you can save or share a clean packet without the rest of the site chrome.
            </p>
          </div>
          <PrintRecipeActions />
        </div>
      </section>

      <section className="space-y-10">
        {((recipes ?? []) as RecipeRow[]).map((recipe) => {
          const ingredients =
            ingredientMap.get(recipe.id)?.filter(Boolean) ??
            splitLines(recipe.ingredients_raw || recipe.ingredients);
          const steps =
            stepMap.get(recipe.id)?.filter(Boolean) ??
            splitInstructionText(recipe.instructions_raw || recipe.instructions || "");
          const metaItems = [
            recipe.servings != null ? `Serves ${recipe.servings}` : null,
            recipe.prep_time_minutes != null ? `Prep ${formatMinutes(recipe.prep_time_minutes)}` : null,
            recipe.cook_time_minutes != null ? `Cook ${formatMinutes(recipe.cook_time_minutes)}` : null,
            recipe.total_time_minutes != null ? `Total ${formatMinutes(recipe.total_time_minutes)}` : null,
            recipe.difficulty ? formatRecipeFacetLabel(recipe.difficulty) : null,
          ].filter(Boolean);

          return (
            <article key={recipe.id} className="recipe-print-card workspace-section">
              <div>
                <h2 className="text-3xl font-semibold">{recipe.name ?? recipe.title ?? "Recipe"}</h2>
                {recipe.summary ?? recipe.description ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 muted">{recipe.summary ?? recipe.description}</p>
                ) : null}
              </div>

              {metaItems.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {metaItems.map((item) => (
                    <span key={item} className="rounded-full border border-[var(--border)] px-3 py-1">
                      {item}
                    </span>
                  ))}
                  {(recipe.tags ?? []).map((tag) => (
                    <span key={tag} className="rounded-full border border-[var(--border)] px-3 py-1">
                      {formatRecipeFacetLabel(tag)}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Ingredients</div>
                  <ul className="mt-4 space-y-2 text-sm leading-6">
                    {ingredients.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Instructions</div>
                  <ol className="mt-4 space-y-3 text-sm leading-6">
                    {steps.map((step, index) => (
                      <li key={`${recipe.id}-${index}`} className="flex gap-3">
                        <span className="font-semibold">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              {recipe.why_this_helps || recipe.notes ? (
                <section className="mt-6 grid gap-6 lg:grid-cols-2">
                  {recipe.why_this_helps ? (
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Why this may help</div>
                      <p className="mt-3 text-sm leading-6 muted">{recipe.why_this_helps}</p>
                    </div>
                  ) : null}
                  {recipe.notes ? (
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Notes</div>
                      <p className="mt-3 text-sm leading-6 muted">{recipe.notes}</p>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
