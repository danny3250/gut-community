import type { SupabaseClient } from "@supabase/supabase-js";

export type ConditionAwareRecipeResult = {
  recipe_id: string;
  recipe_name: string;
  recipe_description: string | null;
  recipe_slug: string | null;
  why_this_helps: string | null;
};

export async function fetchConditionAwareRecipes(
  supabase: SupabaseClient,
  conditionIds: string[]
) {
  if (conditionIds.length === 0) {
    return [] as ConditionAwareRecipeResult[];
  }

  const { data, error } = await supabase.rpc("filter_condition_aware_recipes", {
    selected_condition_ids: conditionIds,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as ConditionAwareRecipeResult[];
}
