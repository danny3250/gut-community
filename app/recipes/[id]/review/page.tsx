"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseIngredientQuantity, parseIngredientsText } from "@/lib/ingredients/parse";
import { splitInstructionText } from "@/lib/recipes/helpers";
import { saveRecipeDraft } from "@/lib/recipes/storage";
import { RecipeIngredientDraft, RecipeStepDraft } from "@/lib/recipes/types";

type RecipeRecord = {
  id: string;
  slug: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  ingredients_raw: string | null;
  instructions_raw: string | null;
  ingredients: string | null;
  instructions: string | null;
  notes: string | null;
  digestion_notes: string | null;
  status: string;
};

type IngredientRow = {
  sort_order: number | null;
  raw_text: string | null;
  raw_line: string | null;
  quantity_numeric: number | null;
  quantity_text: string | null;
  unit: string | null;
  ingredient_name: string | null;
  item_name: string | null;
  preparation_note: string | null;
  notes: string | null;
  optional_flag: boolean | null;
};

type StepRow = {
  step_number: number;
  body: string;
};

export default function ReviewRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeRecord | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>([]);
  const [steps, setSteps] = useState<RecipeStepDraft[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const resolved = await params;
      setRecipeId(resolved.id);
    })();
  }, [params]);

  useEffect(() => {
    if (!recipeId) return;

    (async () => {
      setLoading(true);
      setMessage(null);

      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select(
          "id,slug,title,summary,description,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,ingredients_raw,instructions_raw,ingredients,instructions,notes,digestion_notes,status"
        )
        .eq("id", recipeId)
        .single();

      if (recipeError || !recipeData) {
        setMessage(recipeError?.message ?? "Could not load recipe.");
        setLoading(false);
        return;
      }

      setRecipe(recipeData as RecipeRecord);

      const { data: ingredientRows } = await supabase
        .from("recipe_ingredients")
        .select("sort_order,raw_text,raw_line,quantity_numeric,quantity_text,unit,ingredient_name,item_name,preparation_note,notes,optional_flag")
        .eq("recipe_id", recipeId)
        .order("sort_order", { ascending: true });

      const { data: stepRows } = await supabase
        .from("recipe_steps")
        .select("step_number,body")
        .eq("recipe_id", recipeId)
        .order("step_number", { ascending: true });

      const { data: tagRows } = await supabase
        .from("recipe_tag_map")
        .select("tag_id")
        .eq("recipe_id", recipeId);

      const fallbackIngredientSource =
        (recipeData.ingredients_raw || recipeData.ingredients || "").trim();
      const parsedIngredients = parseIngredientsText(fallbackIngredientSource);

      setIngredients(
        ingredientRows && ingredientRows.length > 0
          ? (ingredientRows as IngredientRow[]).map((row, index) => ({
              sortOrder: row.sort_order ?? index + 1,
              rawText: row.raw_text ?? row.raw_line ?? "",
              quantityNumeric: row.quantity_numeric,
              quantityText: row.quantity_text,
              unit: row.unit,
              ingredientName: row.ingredient_name ?? row.item_name ?? row.raw_text ?? row.raw_line ?? "",
              preparationNote: row.preparation_note ?? row.notes,
              optionalFlag: row.optional_flag ?? false,
            }))
          : parsedIngredients
      );

      setSteps(
        stepRows && stepRows.length > 0
          ? (stepRows as StepRow[]).map((row) => ({
              stepNumber: row.step_number,
              body: row.body,
            }))
          : splitInstructionText(recipeData.instructions_raw || recipeData.instructions || "")
              .map((body, index) => ({ stepNumber: index + 1, body }))
      );

      setTagIds((tagRows ?? []).map((row: { tag_id: string }) => row.tag_id));
      setLoading(false);
    })();
  }, [recipeId, supabase]);

  function updateIngredient(index: number, patch: Partial<RecipeIngredientDraft>) {
    setIngredients((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  function updateStep(index: number, body: string) {
    setSteps((current) =>
      current.map((step, stepIndex) => (stepIndex === index ? { ...step, body } : step))
    );
  }

  async function persistRecipe(status: "draft" | "published") {
    if (!recipe) return;

    setSaving(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Not logged in.");
      return;
    }

    try {
      const result = await saveRecipeDraft(supabase, {
        recipeId: recipe.id,
        createdBy: user.id,
        title: recipe.title,
        slug: recipe.slug ?? recipe.title.toLowerCase().replace(/\s+/g, "-"),
        summary: recipe.summary ?? recipe.description ?? "",
        imageUrl: null,
        servings: recipe.servings,
        prepTimeMinutes: recipe.prep_time_minutes,
        cookTimeMinutes: recipe.cook_time_minutes,
        totalTimeMinutes: recipe.total_time_minutes,
        ingredientsRaw: recipe.ingredients_raw ?? recipe.ingredients ?? "",
        instructionsRaw: recipe.instructions_raw ?? recipe.instructions ?? "",
        notes: recipe.notes,
        digestionNotes: recipe.digestion_notes,
        isPublic: status === "published",
        status,
        tagIds,
        ingredients: ingredients.map((ingredient, index) => ({
          ...ingredient,
          sortOrder: index + 1,
        })),
        steps: steps.map((step, index) => ({
          stepNumber: index + 1,
          body: step.body,
        })),
      });

      router.push(status === "published" ? `/recipes/${result.recipeId}` : `/recipes/${result.recipeId}/edit`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not save review changes.");
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  if (loading) {
    return <main className="shell py-6 sm:py-10"><div className="panel px-5 py-4 text-sm muted">Loading...</div></main>;
  }

  if (!recipe) {
    return <main className="shell py-6 sm:py-10"><div className="panel px-5 py-4 text-sm">{message ?? "Recipe not found."}</div></main>;
  }

  return (
    <main className="shell max-w-6xl space-y-6 py-6 sm:py-10">
      <Link href={`/recipes/${recipe.id}/edit`} className="text-sm muted hover:text-[var(--foreground)]">
        Back to edit recipe
      </Link>

      <section className="panel px-6 py-8 sm:px-8">
        <h1 className="text-4xl font-semibold">Review and publish</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          This is the final structured check before publishing. If parsing got close but not perfect,
          fix the ingredient rows or steps here and then publish when it reads cleanly.
        </p>
      </section>

      {message && <div className="panel px-5 py-4 text-sm">{message}</div>}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="panel space-y-4 px-6 py-6 sm:px-8">
          <div className="text-sm font-semibold">Structured ingredients</div>
          {ingredients.map((ingredient, index) => (
            <div key={`${ingredient.rawText}-${index}`} className="grid gap-3 md:grid-cols-[120px_120px_1fr_1fr]">
              <input
                className="field"
                value={ingredient.quantityText ?? ""}
                onChange={(event) =>
                  updateIngredient(index, {
                    quantityText: event.target.value || null,
                    quantityNumeric: parseIngredientQuantity(event.target.value),
                  })
                }
                placeholder="Qty"
              />
              <input
                className="field"
                value={ingredient.unit ?? ""}
                onChange={(event) => updateIngredient(index, { unit: event.target.value || null })}
                placeholder="Unit"
              />
              <input
                className="field"
                value={ingredient.ingredientName}
                onChange={(event) => updateIngredient(index, { ingredientName: event.target.value })}
                placeholder="Ingredient"
              />
              <input
                className="field"
                value={ingredient.preparationNote ?? ""}
                onChange={(event) => updateIngredient(index, { preparationNote: event.target.value || null })}
                placeholder="Prep note"
              />
            </div>
          ))}
        </div>

        <div className="panel space-y-4 px-6 py-6 sm:px-8">
          <div className="text-sm font-semibold">Structured instructions</div>
          {steps.map((step, index) => (
            <div key={`${step.stepNumber}-${index}`} className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
                {index + 1}
              </div>
              <textarea className="field min-h-[96px]" value={step.body} onChange={(event) => updateStep(index, event.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" disabled={saving} onClick={() => persistRecipe("draft")}>
          {saving ? "Saving..." : "Save as draft"}
        </button>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => persistRecipe("published")}>
          {saving ? "Publishing..." : "Submit and publish"}
        </button>
      </div>
    </main>
  );
}
