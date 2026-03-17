import type { SupabaseClient } from "@supabase/supabase-js";

export type RecipeFilterRow = {
  id: string;
  slug: string | null;
  title: string | null;
  name: string | null;
  summary: string | null;
  description: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  conditions_supported: string[];
  tags: string[];
  avoids: string[];
  ingredient_ids: string[];
  why_this_helps: string | null;
  status: string;
  created_at: string;
};

function toPostgresUuidArray(values: string[]) {
  return `{${values.join(",")}}`;
}

export async function getRecipesByConditions(
  supabase: SupabaseClient,
  conditions: string[],
  avoidIngredients: string[] = []
) {
  let query = supabase
    .from("recipes")
    .select("id,slug,title,name,summary,description,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,conditions_supported,tags,avoids,ingredient_ids,why_this_helps,status,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (conditions.length > 0) {
    query = query.contains("conditions_supported", conditions);
  }

  if (avoidIngredients.length > 0) {
    query = query.filter("ingredient_ids", "not.ov", toPostgresUuidArray(avoidIngredients));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RecipeFilterRow[];
}
