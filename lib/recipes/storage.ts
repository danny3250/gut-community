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
  await syncRecipeConditions(supabase, recipeId, input.conditionIds ?? []);
  await syncRecipeDenormalizedFields(supabase, recipeId);

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

async function syncRecipeConditions(
  supabase: SupabaseClient,
  recipeId: string,
  conditionIds: string[]
) {
  await supabase.from("recipe_conditions").delete().eq("recipe_id", recipeId);

  if (conditionIds.length === 0) return;

  const rows = conditionIds.map((conditionId) => ({
    recipe_id: recipeId,
    condition_id: conditionId,
  }));

  const { error } = await supabase.from("recipe_conditions").insert(rows);
  if (error) throw error;
}

async function syncRecipeDenormalizedFields(
  supabase: SupabaseClient,
  recipeId: string
) {
  const [
    { data: conditionRows, error: conditionError },
    { data: tagRows, error: tagError },
    { data: ingredientRows, error: ingredientError },
  ] = await Promise.all([
    supabase
      .from("recipe_conditions")
      .select("condition_id,conditions(slug)")
      .eq("recipe_id", recipeId),
    supabase
      .from("recipe_tag_map")
      .select("recipe_tags(slug)")
      .eq("recipe_id", recipeId),
    supabase
      .from("recipe_ingredients")
      .select("ingredient_id")
      .eq("recipe_id", recipeId)
      .not("ingredient_id", "is", null),
  ]);

  if (conditionError) throw conditionError;
  if (tagError) throw tagError;
  if (ingredientError) throw ingredientError;

  const conditionsSupported = Array.from(
    new Set(
      (conditionRows ?? [])
        .flatMap((row) => {
          const condition = Array.isArray(row.conditions) ? row.conditions[0] : row.conditions;
          return condition?.slug ? [condition.slug] : [];
        })
        .sort()
    )
  );

  const tags = Array.from(
    new Set(
      (tagRows ?? [])
        .flatMap((row) => {
          const tag = Array.isArray(row.recipe_tags) ? row.recipe_tags[0] : row.recipe_tags;
          return tag?.slug ? [tag.slug] : [];
        })
        .sort()
    )
  );

  const ingredientIds = Array.from(
    new Set(
      (ingredientRows ?? [])
        .map((row) => row.ingredient_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  const conditionIds = (conditionRows ?? [])
    .map((row) => {
      const condition = Array.isArray(row.conditions) ? row.conditions[0] : row.conditions;
      return condition?.slug ? row.condition_id ?? null : null;
    })
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  let avoids: string[] = [];
  if (conditionIds.length > 0) {
    const { data: avoidRows, error: avoidError } = await supabase
      .from("ingredient_avoidance")
      .select("ingredients(slug)")
      .in("condition_id", conditionIds);

    if (avoidError) throw avoidError;

    avoids = Array.from(
      new Set(
        (avoidRows ?? [])
          .flatMap((row) => {
            const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;
            return ingredient?.slug ? [ingredient.slug] : [];
          })
          .sort()
      )
    );
  }

  const { error } = await supabase
    .from("recipes")
    .update({
      conditions_supported: conditionsSupported,
      tags,
      avoids,
      ingredient_ids: ingredientIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipeId);

  if (error) throw error;
}
