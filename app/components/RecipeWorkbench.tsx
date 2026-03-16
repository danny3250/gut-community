"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseIngredientQuantity, parseIngredientsText } from "@/lib/ingredients/parse";
import { parseNullableNumber, slugifyRecipeTitle, splitInstructionText } from "@/lib/recipes/helpers";
import { parseRecipeText } from "@/lib/recipes/parseRecipeText";
import { saveRecipeDraft } from "@/lib/recipes/storage";
import { RecipeIngredientDraft, RecipeStepDraft } from "@/lib/recipes/types";

type RecipeTag = {
  id: string;
  name: string;
};

type RecipeWorkbenchProps = {
  mode: "manual" | "import";
  recipeId?: string;
};

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

export default function RecipeWorkbench({ mode, recipeId }: RecipeWorkbenchProps) {
  const supabase = createClient();
  const router = useRouter();

  const [rawPaste, setRawPaste] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [servings, setServings] = useState("");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("");
  const [cookTimeMinutes, setCookTimeMinutes] = useState("");
  const [totalTimeMinutes, setTotalTimeMinutes] = useState("");
  const [ingredientsRaw, setIngredientsRaw] = useState("");
  const [instructionsRaw, setInstructionsRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [digestionNotes, setDigestionNotes] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>([]);
  const [steps, setSteps] = useState<RecipeStepDraft[]>([]);
  const [parseNotes, setParseNotes] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<RecipeTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const parsedPreview = useMemo(() => {
    if (mode !== "import" || !rawPaste.trim()) return null;
    return parseRecipeText(rawPaste, { mode: "single" });
  }, [mode, rawPaste]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("recipe_tags").select("id,name").order("name");
      setAllTags((data ?? []) as RecipeTag[]);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!recipeId) {
      return;
    }

    (async () => {
      setLoadingRecipe(true);
      setMessage(null);

      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select(
          "id,slug,title,summary,description,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,ingredients_raw,instructions_raw,ingredients,instructions,notes,digestion_notes"
        )
        .eq("id", recipeId)
        .single();

      if (recipeError || !recipeData) {
        setMessage(recipeError?.message ?? "Could not load recipe.");
        setLoadingRecipe(false);
        return;
      }

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

      const recipeRecord = recipeData as RecipeRecord;
      const fallbackIngredients = parseIngredientsText(
        (recipeRecord.ingredients_raw || recipeRecord.ingredients || "").trim()
      );
      const fallbackSteps = splitInstructionText(
        (recipeRecord.instructions_raw || recipeRecord.instructions || "").trim()
      ).map((body, index) => ({
        stepNumber: index + 1,
        body,
      }));

      setTitle(recipeRecord.title);
      setSummary(recipeRecord.summary ?? recipeRecord.description ?? "");
      setServings(recipeRecord.servings != null ? String(recipeRecord.servings) : "");
      setPrepTimeMinutes(
        recipeRecord.prep_time_minutes != null ? String(recipeRecord.prep_time_minutes) : ""
      );
      setCookTimeMinutes(
        recipeRecord.cook_time_minutes != null ? String(recipeRecord.cook_time_minutes) : ""
      );
      setTotalTimeMinutes(
        recipeRecord.total_time_minutes != null ? String(recipeRecord.total_time_minutes) : ""
      );
      setIngredientsRaw(recipeRecord.ingredients_raw ?? recipeRecord.ingredients ?? "");
      setInstructionsRaw(recipeRecord.instructions_raw ?? recipeRecord.instructions ?? "");
      setNotes(recipeRecord.notes ?? "");
      setDigestionNotes(recipeRecord.digestion_notes ?? "");
      setIngredients(
        ingredientRows && ingredientRows.length > 0
          ? (ingredientRows as IngredientRow[]).map((row, index) => ({
              sortOrder: row.sort_order ?? index + 1,
              rawText: row.raw_text ?? row.raw_line ?? "",
              quantityNumeric: row.quantity_numeric,
              quantityText: row.quantity_text,
              unit: row.unit,
              ingredientName:
                row.ingredient_name ?? row.item_name ?? row.raw_text ?? row.raw_line ?? "",
              preparationNote: row.preparation_note ?? row.notes,
              optionalFlag: row.optional_flag ?? false,
            }))
          : fallbackIngredients
      );
      setSteps(
        stepRows && stepRows.length > 0
          ? (stepRows as StepRow[]).map((row) => ({
              stepNumber: row.step_number,
              body: row.body,
            }))
          : fallbackSteps
      );
      setSelectedTagIds(
        new Set((tagRows ?? []).map((row: { tag_id: string }) => row.tag_id))
      );
      setLoadingRecipe(false);
    })();
  }, [recipeId, supabase]);

  function applyParsedRecipe() {
    if (!parsedPreview) return;
    setTitle(parsedPreview.title);
    setSummary(parsedPreview.summary);
    setServings(parsedPreview.servings != null ? String(parsedPreview.servings) : "");
    setPrepTimeMinutes(parsedPreview.prepTimeMinutes != null ? String(parsedPreview.prepTimeMinutes) : "");
    setCookTimeMinutes(parsedPreview.cookTimeMinutes != null ? String(parsedPreview.cookTimeMinutes) : "");
    setTotalTimeMinutes(parsedPreview.totalTimeMinutes != null ? String(parsedPreview.totalTimeMinutes) : "");
    setIngredientsRaw(parsedPreview.ingredientsRaw);
    setInstructionsRaw(parsedPreview.instructionsRaw);
    setNotes(parsedPreview.notes ?? "");
    setDigestionNotes(parsedPreview.digestionNotes ?? "");
    setIngredients(parsedPreview.ingredients);
    setSteps(parsedPreview.steps);
    setParseNotes(parsedPreview.parseNotes);
    setMessage("Recipe text parsed. Review and adjust before saving.");
  }

  function rebuildStructuredFields() {
    setIngredients(
      parseIngredientsText(ingredientsRaw).map((ingredient, index) => ({
        sortOrder: index + 1,
        rawText: ingredient.rawText,
        quantityNumeric: ingredient.quantityNumeric,
        quantityText: ingredient.quantityText,
        unit: ingredient.unit,
        ingredientName: ingredient.ingredientName,
        preparationNote: ingredient.preparationNote,
        optionalFlag: ingredient.optionalFlag,
      }))
    );

    setSteps(
      splitInstructionText(instructionsRaw).map((body, index) => ({
        stepNumber: index + 1,
        body,
      }))
    );

    setMessage("Structured ingredients and steps rebuilt from the text fields.");
  }

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

  async function onSaveDraft() {
    setSaving(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("You must be logged in to save recipes.");
      return;
    }

    try {
      const result = await saveRecipeDraft(supabase, {
        recipeId,
        createdBy: user.id,
        title: title.trim() || "Untitled recipe",
        slug: slugifyRecipeTitle(title.trim() || "untitled-recipe"),
        summary: summary.trim(),
        imageUrl: null,
        servings: parseNullableNumber(servings),
        prepTimeMinutes: parseNullableNumber(prepTimeMinutes),
        cookTimeMinutes: parseNullableNumber(cookTimeMinutes),
        totalTimeMinutes: parseNullableNumber(totalTimeMinutes),
        ingredientsRaw,
        instructionsRaw,
        notes: notes.trim() || null,
        digestionNotes: digestionNotes.trim() || null,
        isPublic: false,
        status: "draft",
        tagIds: Array.from(selectedTagIds),
        ingredients: ingredients.map((ingredient, index) => ({
          ...ingredient,
          sortOrder: index + 1,
        })),
        steps: steps
          .map((step, index) => ({
            stepNumber: index + 1,
            body: step.body.trim(),
          }))
          .filter((step) => step.body.length > 0),
      });

      router.push(`/recipes/${result.recipeId}/review`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not save recipe draft.");
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  return (
    <main className="shell max-w-6xl space-y-6 py-6 sm:py-10">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow">{mode === "import" ? "Paste-in importer" : "Manual recipe entry"}</span>
            <h1 className="mt-4 text-4xl font-semibold">
              {recipeId
                ? "Refine a structured recipe draft"
                : mode === "import"
                  ? "Import a whole recipe and review the structure"
                  : "Create a structured recipe draft"}
            </h1>
            <p className="mt-3 text-sm leading-6 muted">
              {recipeId
                ? "Update the recipe fields, clean up ingredient rows, and keep the structured data ready for public display and future shopping lists."
                : mode === "import"
                ? "Paste the full recipe, let the parser do a practical first pass, then fix anything that needs a human touch before saving."
                : "Enter the recipe details once, then store ingredient rows and steps in a way that is ready for filtering, shopping lists, and future recommendations."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {mode === "import" ? (
              <Link href="/recipes/new" className="btn-secondary">
                Manual entry
              </Link>
            ) : (
              <Link href="/recipes/import" className="btn-secondary">
                Paste import
              </Link>
            )}
            <Link href="/app/admin/recipes/new" className="btn-secondary">
              Admin route
            </Link>
          </div>
        </div>
      </section>

      {mode === "import" && (
        <section className="panel px-6 py-6 sm:px-8">
          <div className="space-y-3">
            <div className="text-sm font-semibold">Paste the full recipe</div>
            <textarea
              className="field min-h-[260px]"
              value={rawPaste}
              onChange={(event) => setRawPaste(event.target.value)}
              placeholder={"Title: Chicken and Rice Soup\n\nServings: 4\n\nIngredients:\n1 tbsp olive oil\n1 small onion, diced"}
            />
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={applyParsedRecipe} disabled={!parsedPreview}>
                Parse recipe text
              </button>
              {parsedPreview && (
                <div className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-3 text-sm muted">
                  Parser confidence: {parsedPreview.confidence}
                </div>
              )}
            </div>
            {parsedPreview?.parseNotes?.length ? (
              <div className="rounded-[24px] border border-[var(--border)] bg-white/72 p-4 text-sm muted">
                <div className="font-semibold text-[var(--foreground)]">Parser notes</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {parsedPreview.parseNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {loadingRecipe && (
        <div className="panel px-5 py-4 text-sm muted">Loading recipe draft...</div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="panel space-y-5 px-6 py-6 sm:px-8">
          <div className="text-sm font-semibold">Recipe details</div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <div className="mb-2 font-medium">Title</div>
              <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="text-sm">
              <div className="mb-2 font-medium">Servings</div>
              <input className="field" value={servings} onChange={(event) => setServings(event.target.value)} />
            </label>

            <label className="text-sm md:col-span-2">
              <div className="mb-2 font-medium">Summary</div>
              <input className="field" value={summary} onChange={(event) => setSummary(event.target.value)} />
            </label>

            <label className="text-sm">
              <div className="mb-2 font-medium">Prep time (minutes)</div>
              <input className="field" value={prepTimeMinutes} onChange={(event) => setPrepTimeMinutes(event.target.value)} />
            </label>
            <label className="text-sm">
              <div className="mb-2 font-medium">Cook time (minutes)</div>
              <input className="field" value={cookTimeMinutes} onChange={(event) => setCookTimeMinutes(event.target.value)} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="mb-2 font-medium">Total time (minutes)</div>
              <input className="field" value={totalTimeMinutes} onChange={(event) => setTotalTimeMinutes(event.target.value)} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <div className="mb-2 font-medium">Notes</div>
              <textarea className="field min-h-[120px]" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <label className="text-sm">
              <div className="mb-2 font-medium">Digestion notes</div>
              <textarea
                className="field min-h-[120px]"
                value={digestionNotes}
                onChange={(event) => setDigestionNotes(event.target.value)}
              />
            </label>
          </div>

          <div>
            <div className="mb-3 text-sm font-medium">Tags</div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const active = selectedTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedTagIds((current) => {
                        const next = new Set(current);
                        if (next.has(tag.id)) next.delete(tag.id);
                        else next.add(tag.id);
                        return next;
                      })
                    }
                    className={
                      active
                        ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-full border border-[var(--border)] bg-white/72 px-4 py-2 text-sm"
                    }
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel space-y-5 px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">Structured preview</div>
            <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={rebuildStructuredFields}>
              Rebuild from text
            </button>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white/72 p-4">
            <div className="text-sm font-medium">Ingredients</div>
            <div className="mt-3 space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={`${ingredient.rawText}-${index}`} className="grid gap-3 md:grid-cols-[110px_110px_1fr_1fr]">
                  <input
                    className="field"
                    value={ingredient.quantityText ?? ""}
                    placeholder="Qty"
                    onChange={(event) =>
                      updateIngredient(index, {
                        quantityText: event.target.value || null,
                        quantityNumeric: parseIngredientQuantity(event.target.value),
                      })
                    }
                  />
                  <input
                    className="field"
                    value={ingredient.unit ?? ""}
                    placeholder="Unit"
                    onChange={(event) => updateIngredient(index, { unit: event.target.value || null })}
                  />
                  <input
                    className="field"
                    value={ingredient.ingredientName}
                    placeholder="Ingredient"
                    onChange={(event) => updateIngredient(index, { ingredientName: event.target.value })}
                  />
                  <input
                    className="field"
                    value={ingredient.preparationNote ?? ""}
                    placeholder="Prep note"
                    onChange={(event) => updateIngredient(index, { preparationNote: event.target.value || null })}
                  />
                </div>
              ))}
              {ingredients.length === 0 && <div className="text-sm muted">No structured ingredients yet.</div>}
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white/72 p-4">
            <div className="text-sm font-medium">Instructions</div>
            <div className="mt-3 space-y-3">
              {steps.map((step, index) => (
                <div key={`${step.stepNumber}-${index}`} className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
                    {index + 1}
                  </div>
                  <textarea
                    className="field min-h-[92px]"
                    value={step.body}
                    onChange={(event) => updateStep(index, event.target.value)}
                  />
                </div>
              ))}
              {steps.length === 0 && <div className="text-sm muted">No structured steps yet.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel px-6 py-6 sm:px-8">
          <div className="mb-3 text-sm font-semibold">Ingredients raw text</div>
          <textarea
            className="field min-h-[220px]"
            value={ingredientsRaw}
            onChange={(event) => setIngredientsRaw(event.target.value)}
            placeholder="One ingredient per line"
          />
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <div className="mb-3 text-sm font-semibold">Instructions raw text</div>
          <textarea
            className="field min-h-[220px]"
            value={instructionsRaw}
            onChange={(event) => setInstructionsRaw(event.target.value)}
            placeholder="One step per line or numbered list"
          />
        </div>
      </section>

      {message && <div className="panel px-5 py-4 text-sm">{message}</div>}
      {parseNotes.length > 0 && (
        <div className="panel px-5 py-4 text-sm muted">Structured review notes: {parseNotes.join(" ")}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={onSaveDraft}>
          {saving ? "Saving draft..." : "Save draft and review"}
        </button>
        <Link href="/recipes" className="btn-secondary">
          Back to recipes
        </Link>
      </div>
    </main>
  );
}
