import type { SupabaseClient } from "@supabase/supabase-js";
import { getRecipeRelevantSignals } from "@/lib/carebridge/checkins";

export type RecipeListRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  prep_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  why_this_helps: string | null;
  tags: string[];
  conditions_supported: string[];
  avoids: string[];
  ingredient_ids: string[];
  created_at: string;
};

export type RecipeProviderLinkRecord = {
  relation_type: string;
  provider: {
    id: string;
    slug: string;
    display_name: string;
    credentials: string | null;
    specialty: string | null;
  } | null;
};

export type RecipeDetailRecord = RecipeListRecord & {
  ingredients_raw: string | null;
  instructions_raw: string | null;
  ingredients: string | null;
  instructions: string | null;
  servings: number | null;
  cook_time_minutes: number | null;
  notes: string | null;
  digestion_notes: string | null;
  nutrition: Record<string, number | null> | null;
  image_url: string | null;
  photo_url: string | null;
  created_by: string;
  status: string;
  provider_links: RecipeProviderLinkRecord[];
};

export type RecipeFilters = {
  conditionSlugs?: string[];
  tagSlugs?: string[];
  avoidIngredientIds?: string[];
  difficulties?: string[];
  maxPrepTimeMinutes?: number | null;
  limit?: number;
};

export type RecommendedRecipeRecord = RecipeListRecord & {
  recommendation_reason: string;
};

type RecipeRow = {
  id: string;
  slug: string | null;
  title: string | null;
  name: string | null;
  summary: string | null;
  description: string | null;
  prep_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  why_this_helps: string | null;
  tags: string[] | null;
  conditions_supported: string[] | null;
  avoids: string[] | null;
  ingredient_ids: string[] | null;
  created_at: string;
  ingredients_raw?: string | null;
  instructions_raw?: string | null;
  ingredients?: string | null;
  instructions?: string | null;
  servings?: number | null;
  cook_time_minutes?: number | null;
  notes?: string | null;
  digestion_notes?: string | null;
  nutrition?: Record<string, number | null> | null;
  image_url?: string | null;
  photo_url?: string | null;
  created_by?: string;
  status?: string;
};

function toPostgresArray(values: string[]) {
  return `{${values.join(",")}}`;
}

function slugifyRecipeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeRecipeRow(row: RecipeRow): RecipeListRecord {
  return {
    id: row.id,
    slug: row.slug?.trim() ? row.slug : slugifyRecipeValue(row.name ?? row.title ?? row.id),
    title: row.name ?? row.title ?? "Recipe",
    summary: row.summary ?? row.description ?? null,
    description: row.description ?? null,
    prep_time_minutes: row.prep_time_minutes ?? null,
    total_time_minutes: row.total_time_minutes ?? null,
    difficulty: row.difficulty ?? null,
    why_this_helps: row.why_this_helps ?? null,
    tags: row.tags ?? [],
    conditions_supported: row.conditions_supported ?? [],
    avoids: row.avoids ?? [],
    ingredient_ids: row.ingredient_ids ?? [],
    created_at: row.created_at,
  };
}

export function formatRecipeFacetLabel(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getPublicRecipes(
  supabase: SupabaseClient,
  filters: RecipeFilters = {}
) {
  let query = supabase
    .from("recipes")
    .select(
      "id,slug,title,name,summary,description,prep_time_minutes,total_time_minutes,difficulty,why_this_helps,tags,conditions_supported,avoids,ingredient_ids,created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (filters.conditionSlugs?.length) {
    query = query.contains("conditions_supported", filters.conditionSlugs);
  }

  if (filters.tagSlugs?.length) {
    query = query.contains("tags", filters.tagSlugs);
  }

  if (filters.avoidIngredientIds?.length) {
    query = query.filter("ingredient_ids", "not.ov", toPostgresArray(filters.avoidIngredientIds));
  }

  if (filters.difficulties?.length) {
    query = query.in("difficulty", filters.difficulties);
  }

  if (typeof filters.maxPrepTimeMinutes === "number") {
    query = query.lte("prep_time_minutes", filters.maxPrepTimeMinutes);
  }

  if (typeof filters.limit === "number") {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as RecipeRow[]).map(normalizeRecipeRow);
}

export async function getRecipeBySlug(supabase: SupabaseClient, slugOrId: string) {
  const normalizedSlug = slugifyRecipeValue(slugOrId);

  let recipe: RecipeRow | null = null;
  const { data: slugMatch, error: slugError } = await supabase
    .from("recipes")
    .select(
      "id,slug,title,name,summary,description,prep_time_minutes,cook_time_minutes,total_time_minutes,difficulty,why_this_helps,tags,conditions_supported,avoids,ingredient_ids,created_at,ingredients_raw,instructions_raw,ingredients,instructions,servings,notes,digestion_notes,nutrition,image_url,photo_url,created_by,status"
    )
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (slugError) throw slugError;
  recipe = (slugMatch as RecipeRow | null) ?? null;

  if (!recipe) {
    const { data: allRows, error } = await supabase
      .from("recipes")
      .select(
        "id,slug,title,name,summary,description,prep_time_minutes,cook_time_minutes,total_time_minutes,difficulty,why_this_helps,tags,conditions_supported,avoids,ingredient_ids,created_at,ingredients_raw,instructions_raw,ingredients,instructions,servings,notes,digestion_notes,nutrition,image_url,photo_url,created_by,status"
      )
      .eq("status", "published");

    if (error) throw error;

    recipe =
      ((allRows ?? []) as RecipeRow[]).find((row) => {
        const normalized = normalizeRecipeRow(row);
        return normalized.slug === normalizedSlug || row.id === slugOrId;
      }) ?? null;
  }

  if (!recipe) return null;

  const normalizedRecipe = normalizeRecipeRow(recipe);
  const { data: providerLinks, error: providerLinkError } = await supabase
    .from("provider_recipe_links")
    .select("relation_type,providers(id,slug,display_name,credentials,specialty)")
    .eq("recipe_id", recipe.id);

  if (providerLinkError) throw providerLinkError;

  const normalizedLinks: RecipeProviderLinkRecord[] = ((providerLinks ?? []) as Array<{
    relation_type: string;
    providers:
      | {
          id: string;
          slug: string | null;
          display_name: string;
          credentials: string | null;
          specialty: string | null;
        }
      | {
          id: string;
          slug: string | null;
          display_name: string;
          credentials: string | null;
          specialty: string | null;
        }[]
      | null;
  }>).map((row) => {
    const provider = Array.isArray(row.providers) ? row.providers[0] ?? null : row.providers ?? null;
    return {
      relation_type: row.relation_type,
      provider: provider
        ? {
            id: provider.id,
            slug: provider.slug?.trim()
              ? provider.slug
              : slugifyRecipeValue(provider.display_name),
            display_name: provider.display_name,
            credentials: provider.credentials,
            specialty: provider.specialty,
          }
        : null,
    };
  });

  return {
    ...normalizedRecipe,
    ingredients_raw: recipe.ingredients_raw ?? null,
    instructions_raw: recipe.instructions_raw ?? null,
    ingredients: recipe.ingredients ?? null,
    instructions: recipe.instructions ?? null,
    servings: recipe.servings ?? null,
    cook_time_minutes: recipe.cook_time_minutes ?? null,
    notes: recipe.notes ?? null,
    digestion_notes: recipe.digestion_notes ?? null,
    nutrition: recipe.nutrition ?? null,
    image_url: recipe.image_url ?? null,
    photo_url: recipe.photo_url ?? null,
    created_by: recipe.created_by ?? "",
    status: recipe.status ?? "published",
    provider_links: normalizedLinks.filter((link) => link.provider),
  } satisfies RecipeDetailRecord;
}

export async function getRecommendedRecipesForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 4
) {
  const signals = await getRecipeRelevantSignals(supabase, userId);
  if (signals.recentCheckinCount < 2) {
    return [] as RecommendedRecipeRecord[];
  }

  const trackedFoodSlugs = signals.commonFoods.map(slugifyRecipeValue);
  const { data: ingredientRows, error: ingredientError } = await supabase
    .from("ingredients")
    .select("id,slug")
    .in("slug", trackedFoodSlugs);

  if (ingredientError) throw ingredientError;

  const avoidIngredientIds = (ingredientRows ?? [])
    .map((row) => row.id as string)
    .filter((value) => typeof value === "string" && value.length > 0);

  const candidates = await getPublicRecipes(supabase, {
    avoidIngredientIds,
    limit: 18,
  });

  const recommended = candidates
    .map((recipe) => {
      let score = 0;
      const reasons: string[] = [];

      const overlapAvoids = trackedFoodSlugs.filter((slug) => recipe.avoids.includes(slug));
      if (overlapAvoids.length > 0) {
        score += 4;
        reasons.push(`Built around avoiding ${formatRecipeFacetLabel(overlapAvoids[0])}`);
      }

      if (recipe.why_this_helps) {
        score += 1;
        reasons.push("Includes supportive guidance");
      }

      if (typeof recipe.prep_time_minutes === "number" && recipe.prep_time_minutes <= 20) {
        score += 1;
        reasons.push("Quick enough for lower-energy days");
      }

      if (recipe.conditions_supported.length > 0) {
        score += 1;
      }

      return {
        ...recipe,
        score,
        recommendation_reason: reasons[0] ?? "Selected from your recent check-in signals",
      };
    })
    .filter((recipe) => recipe.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ score: _score, ...recipe }) => recipe);

  return recommended;
}
