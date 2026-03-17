import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRecentCheckins, summarizeCheckinTrends } from "@/lib/carebridge/health";
import { getPublicRecipes, type RecommendedRecipeRecord } from "@/lib/carebridge/recipes";

type RecommendationSource = "visit_summary" | "checkin_trends";

export type PersonalizedRecommendedRecipe = RecommendedRecipeRecord & {
  recommendation_source: RecommendationSource;
};

type ConditionRow = {
  id: string;
  name: string;
  slug: string;
};

type IngredientRow = {
  id: string;
  name: string;
  slug: string;
};

type RecentNoteRow = {
  subject: string | null;
  note_body: string;
  structured_notes: Record<string, unknown>;
  updated_at: string;
};

const CONDITION_TAG_PREFERENCES: Record<string, string[]> = {
  ibs: ["low_fodmap"],
  hypertension: ["anti_inflammatory"],
  anxiety: ["anti_inflammatory"],
};

export async function getRecommendedRecipesForUser(userId: string, limit = 6) {
  const supabase = createAdminClient();
  const [{ data: patient }, checkins, { data: conditions }, { data: ingredients }] = await Promise.all([
    supabase.from("patients").select("id").eq("user_id", userId).maybeSingle<{ id: string }>(),
    getUserRecentCheckins(supabase, userId, 14),
    supabase.from("conditions").select("id,name,slug").order("name"),
    supabase.from("ingredients").select("id,name,slug").order("name"),
  ]);

  if (!patient) {
    return [] as PersonalizedRecommendedRecipe[];
  }

  const recentNotes = await fetchRecentVisitNotes(patient.id);
  const trends = summarizeCheckinTrends(checkins);

  const conditionRows = (conditions ?? []) as ConditionRow[];
  const ingredientRows = (ingredients ?? []) as IngredientRow[];
  const visitSignals = extractVisitSummarySignals(recentNotes, conditionRows, ingredientRows);
  const trendSignals = extractCheckinSignals(trends, ingredientRows);

  const conditionSlugs = Array.from(
    new Set([
      ...visitSignals.conditionSlugs,
      ...(visitSignals.conditionSlugs.length === 0 ? trendSignals.conditionSlugs : []),
    ])
  );
  const avoidIngredientIds = Array.from(
    new Set([
      ...visitSignals.avoidIngredientIds,
      ...trendSignals.avoidIngredientIds,
    ])
  );
  const focusIngredientIds = new Set(visitSignals.focusIngredientIds);
  const source: RecommendationSource =
    visitSignals.conditionSlugs.length > 0 || visitSignals.avoidIngredientIds.length > 0 || visitSignals.focusIngredientIds.length > 0
      ? "visit_summary"
      : "checkin_trends";

  if (checkins.length === 0 && source !== "visit_summary") {
    return [] as PersonalizedRecommendedRecipe[];
  }

  const candidates = await getPublicRecipes(supabase, {
    conditionSlugs,
    avoidIngredientIds,
    limit: 24,
  });

  if (candidates.length === 0) {
    return [] as PersonalizedRecommendedRecipe[];
  }

  const avoidSlugSet = new Set(
    ingredientRows.filter((ingredient) => avoidIngredientIds.includes(ingredient.id)).map((ingredient) => ingredient.slug)
  );

  return candidates
    .map((recipe) => {
      let score = 0;

      const matchedConditions = recipe.conditions_supported.filter((condition) => conditionSlugs.includes(condition));
      score += matchedConditions.length * (source === "visit_summary" ? 5 : 3);

      const helpfulAvoids = recipe.avoids.filter((slug) => avoidSlugSet.has(slug));
      score += helpfulAvoids.length * 2;

      const preferredTags = matchedConditions.flatMap((condition) => CONDITION_TAG_PREFERENCES[condition] ?? []);
      const matchedTags = recipe.tags.filter((tag) => preferredTags.includes(tag));
      score += matchedTags.length * 2;

      const ingredientOverlap = recipe.ingredient_ids.filter((id) => focusIngredientIds.has(id)).length;
      score += ingredientOverlap * 2;

      if (recipe.why_this_helps) score += 1;
      if (typeof recipe.prep_time_minutes === "number" && recipe.prep_time_minutes <= 20) score += 1;

      return {
        ...recipe,
        recommendation_reason: buildRecommendationReason({
          source,
          matchedConditions,
          helpfulAvoids,
          matchedTags,
        }),
        recommendation_source: source,
        score,
      };
    })
    .filter((recipe) => recipe.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ score: _score, ...recipe }) => recipe);
}

async function fetchRecentVisitNotes(patientId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("provider_visit_notes")
    .select("subject,note_body,structured_notes,updated_at")
    .eq("patient_id", patientId)
    .order("finalized_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(4);

  if (error) throw error;
  return (data ?? []) as RecentNoteRow[];
}

function extractVisitSummarySignals(
  notes: RecentNoteRow[],
  conditions: ConditionRow[],
  ingredients: IngredientRow[]
) {
  const corpus = notes
    .flatMap((note) => [
      note.subject ?? "",
      note.note_body,
      ...Object.values(note.structured_notes ?? {}).map((value) => (typeof value === "string" ? value : "")),
    ])
    .join(" ")
    .toLowerCase();

  const conditionSlugs = conditions
    .filter((condition) => corpus.includes(condition.slug.toLowerCase()) || corpus.includes(condition.name.toLowerCase()))
    .map((condition) => condition.slug);

  const avoidIngredientIds = ingredients
    .filter((ingredient) => hasGuidanceKeywordNear(corpus, ingredient.name.toLowerCase(), ["avoid", "limit", "skip", "reduce"]))
    .map((ingredient) => ingredient.id);

  const focusIngredientIds = ingredients
    .filter((ingredient) => hasGuidanceKeywordNear(corpus, ingredient.name.toLowerCase(), ["focus on", "include", "prioritize", "add"]))
    .map((ingredient) => ingredient.id);

  return {
    conditionSlugs,
    avoidIngredientIds,
    focusIngredientIds,
  };
}

function extractCheckinSignals(
  trends: ReturnType<typeof summarizeCheckinTrends>,
  ingredients: IngredientRow[]
) {
  const symptomNames = trends.symptomFrequency.map((symptom) => symptom.name.toLowerCase());
  const commonFoodSlugs = new Set(
    ingredients
      .filter((ingredient) =>
        trends.recentFoods.some((food) => food.name.toLowerCase() === ingredient.name.toLowerCase())
      )
      .map((ingredient) => ingredient.slug)
  );

  const conditionSlugs: string[] = [];
  if (symptomNames.some((value) => ["bloating", "cramping", "digestive discomfort", "constipation", "diarrhea"].includes(value))) {
    conditionSlugs.push("ibs");
  }
  if (symptomNames.includes("anxiety") || (trends.averageStressLevel ?? 0) >= 4) {
    conditionSlugs.push("anxiety");
  }

  const avoidIngredientIds = ingredients
    .filter((ingredient) => {
      if (!commonFoodSlugs.has(ingredient.slug)) return false;
      return (
        (trends.averageFeeling ?? 5) <= 3.5 ||
        trends.symptomFrequency.length >= 2
      );
    })
    .map((ingredient) => ingredient.id);

  return {
    conditionSlugs,
    avoidIngredientIds,
  };
}

function buildRecommendationReason({
  source,
  matchedConditions,
  helpfulAvoids,
  matchedTags,
}: {
  source: RecommendationSource;
  matchedConditions: string[];
  helpfulAvoids: string[];
  matchedTags: string[];
}) {
  if (source === "visit_summary") {
    if (helpfulAvoids.length > 0) {
      return `Aligned with your last visit and avoids ${formatFacet(helpfulAvoids[0])}.`;
    }
    if (matchedConditions.length > 0) {
      return `Aligned with your last visit guidance for ${formatFacet(matchedConditions[0])}.`;
    }
    return "Aligned with your last visit guidance.";
  }

  if (matchedConditions.length > 0 && helpfulAvoids.length > 0) {
    return `Supports ${formatFacet(matchedConditions[0])} and avoids common triggers.`;
  }
  if (matchedConditions.length > 0) {
    return `Based on your recent check-ins and supportive for ${formatFacet(matchedConditions[0])}.`;
  }
  if (matchedTags.length > 0) {
    return `Based on your recent check-ins and tagged ${formatFacet(matchedTags[0])}.`;
  }
  return "Based on your recent check-ins.";
}

function formatFacet(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hasGuidanceKeywordNear(corpus: string, term: string, keywords: string[]) {
  return keywords.some((keyword) => {
    const pattern = new RegExp(`(?:${escapeRegex(keyword)})[^.]{0,40}\\b${escapeRegex(term)}\\b|\\b${escapeRegex(term)}\\b[^.]{0,40}(?:${escapeRegex(keyword)})`, "i");
    return pattern.test(corpus);
  });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
