"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicBrandMark from "@/app/components/PublicBrandMark";
import { createClient } from "@/lib/supabase/client";
import FavoritesDrawer from "./FavoritesDrawer";
import SaveToggle from "./SaveToggle";
import {
  formatRecipeFacetLabel,
  getPublicRecipes,
  getRecommendedRecipesForUser,
  type RecipeListRecord,
  type RecommendedRecipeRecord,
} from "@/lib/carebridge/recipes";

type FilterOption = {
  id: string;
  name: string;
  slug: string;
};

type DraftRecipeRow = {
  id: string;
  title: string | null;
  summary: string | null;
  description: string | null;
  created_at: string;
};

function formatMinutes(value: number | null) {
  if (value == null) return null;
  return `${value} min`;
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export default function RecipesPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [tab, setTab] = useState<"published" | "drafts">("published");

  const [conditionOptions, setConditionOptions] = useState<FilterOption[]>([]);
  const [tagOptions, setTagOptions] = useState<FilterOption[]>([]);
  const [avoidOptions, setAvoidOptions] = useState<FilterOption[]>([]);

  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedAvoids, setSelectedAvoids] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());
  const [maxPrepTime, setMaxPrepTime] = useState<number | null>(null);

  const [publishedRecipes, setPublishedRecipes] = useState<RecipeListRecord[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<RecommendedRecipeRecord[]>([]);
  const [draftRecipes, setDraftRecipes] = useState<DraftRecipeRow[]>([]);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedConditionSlugs = useMemo(
    () => conditionOptions.filter((option) => selectedConditions.has(option.id)).map((option) => option.slug),
    [conditionOptions, selectedConditions]
  );
  const selectedTagSlugs = useMemo(
    () => tagOptions.filter((option) => selectedTags.has(option.id)).map((option) => option.slug),
    [selectedTags, tagOptions]
  );
  const selectedAvoidIds = useMemo(
    () => avoidOptions.filter((option) => selectedAvoids.has(option.id)).map((option) => option.id),
    [avoidOptions, selectedAvoids]
  );
  const selectedDifficultyValues = useMemo(() => Array.from(selectedDifficulties), [selectedDifficulties]);

  function toggleSelection(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function refreshFavorites(currentUserId?: string | null) {
    const resolvedUserId = currentUserId ?? userId;
    if (!resolvedUserId) {
      setFavoriteIds(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("user_id", resolvedUserId);

    if (error) return;

    setFavoriteIds(
      new Set(
        (data ?? [])
          .map((row: { recipe_id: string }) => row.recipe_id)
          .filter((value) => typeof value === "string" && value.length > 0)
      )
    );
  }

  useEffect(() => {
    (async () => {
      const [{ data: userData }, { data: conditionRows }, { data: tagRows }, { data: ingredientRows }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase.from("conditions").select("id,name,slug").order("name"),
          supabase.from("recipe_tags").select("id,name,slug").order("name"),
          supabase.from("ingredients").select("id,name,slug").order("name"),
        ]);

      const resolvedUserId = userData.user?.id ?? null;
      setUserId(resolvedUserId);
      setConditionOptions(sortByName((conditionRows ?? []) as FilterOption[]));
      setTagOptions(sortByName((tagRows ?? []) as FilterOption[]));
      setAvoidOptions(sortByName((ingredientRows ?? []) as FilterOption[]));
      await refreshFavorites(resolvedUserId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId && tab === "drafts") {
      setTab("published");
    }
  }, [tab, userId]);

  useEffect(() => {
    (async () => {
      setLoadingPublished(true);
      setErrorMessage(null);

      try {
        const rows = await getPublicRecipes(supabase, {
          conditionSlugs: selectedConditionSlugs,
          tagSlugs: selectedTagSlugs,
          avoidIngredientIds: selectedAvoidIds,
          difficulties: selectedDifficultyValues,
          maxPrepTimeMinutes: maxPrepTime,
          limit: 60,
        });

        setPublishedRecipes(rows);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load recipes.");
        setPublishedRecipes([]);
      }

      setLoadingPublished(false);
    })();
  }, [maxPrepTime, selectedAvoidIds, selectedConditionSlugs, selectedDifficultyValues, selectedTagSlugs, supabase]);

  useEffect(() => {
    if (!userId) {
      setRecommendedRecipes([]);
      setLoadingRecommended(false);
      return;
    }

    (async () => {
      setLoadingRecommended(true);

      try {
        const rows = await getRecommendedRecipesForUser(supabase, userId, 4);
        setRecommendedRecipes(rows);
      } catch {
        setRecommendedRecipes([]);
      }

      setLoadingRecommended(false);
    })();
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) {
      setDraftRecipes([]);
      setLoadingDrafts(false);
      return;
    }

    (async () => {
      setLoadingDrafts(true);

      const { data, error } = await supabase
        .from("recipes")
        .select("id,title,summary,description,created_at")
        .eq("status", "draft")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (!error) {
        setDraftRecipes((data ?? []) as DraftRecipeRow[]);
      }

      setLoadingDrafts(false);
    })();
  }, [supabase, userId]);

  const visibleRecipes = tab === "published" ? publishedRecipes : draftRecipes;
  const loadingVisible = tab === "published" ? loadingPublished : loadingDrafts;

  return (
    <main className="shell space-y-6 py-6 sm:py-10">
      <PublicBrandMark />
      <section className="panel flex flex-col gap-6 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <span className="eyebrow">Recipes</span>
          <h1 className="mt-4 text-4xl font-semibold">Browse supportive recipes without needing an account.</h1>
          <p className="mt-3 text-sm leading-6 muted sm:text-base">
            Explore public recipes by condition, tags, and ingredient triggers. Sign in when you want to save favorites or receive more personalized suggestions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {userId ? (
            <>
              <button className="btn-secondary" type="button" onClick={() => setFavoritesOpen(true)}>
                Favorites
              </button>
              <Link className="btn-secondary" href="/portal/recipes">
                Personalized recipes
              </Link>
            </>
          ) : (
            <>
              <Link className="btn-secondary" href="/login">
                Sign in
              </Link>
              <Link className="btn-primary" href="/signup">
                Create account
              </Link>
            </>
          )}
        </div>
      </section>

      {userId ? (
        <section className="panel px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="eyebrow">Recommended for you</span>
              <h2 className="mt-3 text-2xl font-semibold">A personalized starting point based on recent check-ins.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 muted">
                These suggestions reflect recent foods, symptom patterns, and care signals you have been tracking. They are supportive meal ideas, not medical advice.
              </p>
            </div>
            <Link href="/portal/recipes" className="btn-secondary">
              Open in portal
            </Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {loadingRecommended ? (
              <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 text-sm muted">
                Loading recommendations...
              </div>
            ) : recommendedRecipes.length === 0 ? (
              <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
                <div className="text-lg font-semibold">No recommendations yet.</div>
                <p className="mt-2 text-sm leading-6 muted">
                  Complete more daily check-ins to personalize this section with recipe suggestions.
                </p>
              </div>
            ) : (
              recommendedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  saved={favoriteIds.has(recipe.id)}
                  userId={userId}
                  onFavoriteChanged={() => refreshFavorites()}
                  recommendationReason={recipe.recommendation_reason}
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel px-5 py-5 sm:px-6">
          <div className="text-sm font-semibold">Filter recipes</div>
          <p className="mt-2 max-w-xl text-sm leading-6 muted">
            Combine conditions, tags, and ingredient avoids to narrow the list. Recipes stay public to browse, while saved items and personalized suggestions stay inside your account.
          </p>
          <div className="mt-4 space-y-5">
            <FilterGroup
              title="Conditions"
              options={conditionOptions}
              selected={selectedConditions}
              onToggle={(id) => toggleSelection(setSelectedConditions, id)}
            />
            <FilterGroup
              title="Tags"
              options={tagOptions}
              selected={selectedTags}
              onToggle={(id) => toggleSelection(setSelectedTags, id)}
            />
            <FilterGroup
              title="Avoid ingredients"
              options={avoidOptions}
              selected={selectedAvoids}
              onToggle={(id) => toggleSelection(setSelectedAvoids, id)}
            />

            <div>
              <div className="text-sm font-semibold">Difficulty</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["easy", "moderate", "advanced"].map((difficulty) => {
                  const selected = selectedDifficulties.has(difficulty);
                  return (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => toggleSelection(setSelectedDifficulties, difficulty)}
                      className={
                        selected
                          ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                          : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                      }
                    >
                      {formatRecipeFacetLabel(difficulty)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">Prep time</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[15, 30, 45].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setMaxPrepTime((current) => (current === minutes ? null : minutes))}
                    className={
                      maxPrepTime === minutes
                        ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                    }
                  >
                    {minutes} min or less
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedConditions.size > 0 ||
          selectedTags.size > 0 ||
          selectedAvoids.size > 0 ||
          selectedDifficulties.size > 0 ||
          maxPrepTime !== null ? (
            <button
              type="button"
              className="mt-5 rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
              onClick={() => {
                setSelectedConditions(new Set());
                setSelectedTags(new Set());
                setSelectedAvoids(new Set());
                setSelectedDifficulties(new Set());
                setMaxPrepTime(null);
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="panel px-5 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("published")}
              className={tab === "published" ? "btn-primary px-4 py-2 text-sm" : "btn-secondary px-4 py-2 text-sm"}
            >
              Public recipes
            </button>
            {userId ? (
              <button
                type="button"
                onClick={() => setTab("drafts")}
                className={tab === "drafts" ? "btn-primary px-4 py-2 text-sm" : "btn-secondary px-4 py-2 text-sm"}
              >
                My drafts
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3 text-sm leading-6 muted">
            <p>Published recipes are available to browse publicly, so patients and families can explore options before they create an account.</p>
            <p>Sign in to save recipes, revisit favorites, and open the personalized recipe experience inside your portal.</p>
          </div>
        </div>
      </section>

      {errorMessage ? <div className="panel px-5 py-4 text-sm">Error: {errorMessage}</div> : null}

      {loadingVisible ? (
        <div className="panel px-5 py-4 text-sm muted">Loading recipes...</div>
      ) : visibleRecipes.length === 0 ? (
        <div className="panel px-5 py-5">
          <div className="text-lg font-semibold">
            {tab === "published" ? "No recipes match those filters." : "You do not have any drafts yet."}
          </div>
          <p className="mt-2 text-sm leading-6 muted">
            {tab === "published"
              ? "Try clearing one or two filters to broaden the results."
              : "Draft recipes will appear here as you build, review, and prepare them for publishing."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tab === "published"
            ? (visibleRecipes as RecipeListRecord[]).map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  saved={favoriteIds.has(recipe.id)}
                  userId={userId}
                  onFavoriteChanged={() => refreshFavorites()}
                />
              ))
            : (visibleRecipes as DraftRecipeRow[]).map((recipe) => (
                <div key={recipe.id} className="panel px-5 py-5">
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-semibold">{recipe.title ?? "Draft recipe"}</div>
                    <span className="rounded-full bg-[var(--warm)] px-3 py-1 text-xs font-semibold">Draft</span>
                  </div>
                  <div className="mt-2 line-clamp-3 text-sm leading-6 muted">
                    {recipe.summary ?? recipe.description ?? "Keep shaping the ingredients and notes until this recipe feels ready to publish."}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="btn-secondary px-4 py-2 text-sm" href={`/recipes/${recipe.id}/edit`}>
                      Edit
                    </Link>
                    <Link className="btn-secondary px-4 py-2 text-sm" href={`/recipes/${recipe.id}/review`}>
                      Review
                    </Link>
                  </div>
                </div>
              ))}
        </div>
      )}

      {userId ? <FavoritesDrawer open={favoritesOpen} onClose={() => setFavoritesOpen(false)} /> : null}
    </main>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={
                isSelected
                  ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
              }
            >
              {option.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecipeCard({
  recipe,
  saved,
  userId,
  onFavoriteChanged,
  recommendationReason,
}: {
  recipe: RecipeListRecord;
  saved: boolean;
  userId: string | null;
  onFavoriteChanged: () => void;
  recommendationReason?: string;
}) {
  const meta = [
    recipe.prep_time_minutes != null ? `Prep ${formatMinutes(recipe.prep_time_minutes)}` : null,
    recipe.total_time_minutes != null ? `Total ${formatMinutes(recipe.total_time_minutes)}` : null,
    recipe.difficulty ? formatRecipeFacetLabel(recipe.difficulty) : null,
  ].filter(Boolean);

  return (
    <div className="panel px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/recipes/${recipe.slug}`} className="block">
            <div className="text-xl font-semibold">{recipe.title}</div>
            {recipe.summary ? <div className="mt-2 line-clamp-3 text-sm leading-6 muted">{recipe.summary}</div> : null}

            {recommendationReason ? (
              <div className="mt-3 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                {recommendationReason}
              </div>
            ) : null}

            {meta.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {meta.map((item) => (
                  <span key={item} className="rounded-full border border-[var(--border)] px-3 py-1 opacity-80">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            {recipe.conditions_supported.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recipe.conditions_supported.slice(0, 3).map((condition) => (
                  <span
                    key={condition}
                    className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-strong)]"
                  >
                    {formatRecipeFacetLabel(condition)}
                  </span>
                ))}
              </div>
            ) : null}

            {recipe.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recipe.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                    {formatRecipeFacetLabel(tag)}
                  </span>
                ))}
              </div>
            ) : null}

            {recipe.why_this_helps ? <div className="mt-3 text-sm leading-6 muted">{recipe.why_this_helps}</div> : null}
          </Link>
        </div>

        {userId ? (
          <SaveToggle recipeId={recipe.id} userId={userId} isSaved={saved} onChanged={onFavoriteChanged} />
        ) : (
          <Link href="/login" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]">
            Sign in to save
          </Link>
        )}
      </div>
    </div>
  );
}
