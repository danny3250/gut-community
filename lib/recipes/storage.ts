import type { SupabaseClient } from "@supabase/supabase-js";
import { RecipeDraftInput } from "@/lib/recipes/types";

type SaveRecipeResult = {
  recipeId: string;
};

export async function saveRecipeDraft(
  supabase: SupabaseClient,
  input: RecipeDraftInput
): Promise<SaveRecipeResult> {
  const recipePayload = {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    description: input.summary,
    image_url: input.imageUrl,
    photo_url: input.imageUrl,
    servings: input.servings,
    prep_time_minutes: input.prepTimeMinutes,
    cook_time_minutes: input.cookTimeMinutes,
    total_time_minutes: input.totalTimeMinutes,
    ingredients_raw: input.ingredientsRaw,
    instructions_raw: input.instructionsRaw,
    ingredients: input.ingredientsRaw,
    instructions: input.instructionsRaw,
    notes: input.notes,
    digestion_notes: input.digestionNotes,
    is_public: input.isPublic,
    is_published: input.isPublic,
    status: input.status,
    created_by: input.createdBy,
    updated_at: new Date().toISOString(),
  };

  let recipeId = input.recipeId;

  if (recipeId) {
    const { error } = await supabase.from("recipes").update(recipePayload).eq("id", recipeId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("recipes")
      .insert(recipePayload)
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Could not save recipe.");
    recipeId = data.id as string;
  }

  await syncRecipeIngredients(supabase, recipeId, input.ingredients);
  await syncRecipeSteps(supabase, recipeId, input.steps);
  await syncRecipeTags(supabase, recipeId, input.tagIds);

  return { recipeId };
}

async function syncRecipeIngredients(
  supabase: SupabaseClient,
  recipeId: string,
  ingredients: RecipeDraftInput["ingredients"]
) {
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

  if (ingredients.length === 0) return;

  const rows = ingredients.map((ingredient, index) => ({
    recipe_id: recipeId,
    sort_order: ingredient.sortOrder ?? index + 1,
    line_no: ingredient.sortOrder ?? index + 1,
    raw_text: ingredient.rawText,
    raw_line: ingredient.rawText,
    quantity_numeric: ingredient.quantityNumeric,
    quantity: ingredient.quantityNumeric,
    quantity_text: ingredient.quantityText,
    unit: ingredient.unit,
    ingredient_name: ingredient.ingredientName,
    item_name: ingredient.ingredientName,
    preparation_note: ingredient.preparationNote,
    notes: ingredient.preparationNote,
    optional_flag: ingredient.optionalFlag,
    confidence: 1,
  }));

  const { error } = await supabase.from("recipe_ingredients").insert(rows);
  if (error) throw error;
}

async function syncRecipeSteps(
  supabase: SupabaseClient,
  recipeId: string,
  steps: RecipeDraftInput["steps"]
) {
  await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);

  if (steps.length === 0) return;

  const rows = steps.map((step, index) => ({
    recipe_id: recipeId,
    step_number: step.stepNumber ?? index + 1,
    body: step.body,
  }));

  const { error } = await supabase.from("recipe_steps").insert(rows);
  if (error) throw error;
}

async function syncRecipeTags(
  supabase: SupabaseClient,
  recipeId: string,
  tagIds: string[]
) {
  await supabase.from("recipe_tag_map").delete().eq("recipe_id", recipeId);

  if (tagIds.length === 0) return;

  const rows = tagIds.map((tagId) => ({
    recipe_id: recipeId,
    tag_id: tagId,
  }));

  const { error } = await supabase.from("recipe_tag_map").insert(rows);
  if (error) throw error;
}
