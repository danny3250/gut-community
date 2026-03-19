"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicBrandMark from "@/app/components/PublicBrandMark";
import { createClient } from "@/lib/supabase/client";
import AddToShoppingListButton from "./AddToShoppingListButton";
import FavoritesDrawer from "./FavoritesDrawer";
import SaveToggle from "./SaveToggle";
import { readShoppingListRecipeIds } from "./shoppingCart";
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
  const [shoppingListCount, setShoppingListCount] = useState(0);
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
    const syncShoppingListCount = () => setShoppingListCount(readShoppingListRecipeIds().length);
    syncShoppingListCount();

    window.addEventListener("carebridge-shopping-list-updated", syncShoppingListCount as EventListener);
    window.addEventListener("storage", syncShoppingListCount);

    return () => {
      window.removeEventListener("carebridge-shopping-list-updated", syncShoppingListCount as EventListener);
      window.removeEventListener("storage", syncShoppingListCount);
    };
  }, []);

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
  const hasActiveFilters =
    selectedConditions.size > 0 ||
    selectedTags.size > 0 ||
    selectedAvoids.size > 0 ||
    selectedDifficulties.size > 0 ||
    maxPrepTime !== null;

  function clearFilters() {
    setSelectedConditions(new Set());
    setSelectedTags(new Set());
    setSelectedAvoids(new Set());
    setSelectedDifficulties(new Set());
    setMaxPrepTime(null);
  }

  return (
    <main className="shell space-y-10 py-6 sm:space-y-14 sm:py-10">
      <PublicBrandMark />
      <section className="relative -mt-[13.5rem] lg:-mt-[17rem]">
        <div className="grid gap-10 pt-3 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 pr-6">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Recipes Menu
              </div>
              <p className="text-sm leading-7 muted">
                Filter recipes by care context, nutrition style, ingredient avoids, and prep time to find something more relevant faster.
              </p>
              <div className="space-y-6">
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
                <CheckboxValueGroup
                  title="Difficulty"
                  values={["easy", "moderate", "advanced"]}
                  selected={selectedDifficulties}
                  onToggle={(value) => toggleSelection(setSelectedDifficulties, value)}
                />
                <PrepTimeGroup maxPrepTime={maxPrepTime} onSelect={setMaxPrepTime} />
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--accent-strong)]"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}

              <div className="inline-panel px-5 py-5 text-sm leading-7 muted">
                Recipes stay public to browse. Sign in when you want to save favorites, return to pinned picks, or open the more personalized portal experience.
                <div className="mt-5 flex flex-wrap gap-3">
                  {userId ? (
                    <>
                      <button className="btn-secondary px-4 py-2 text-sm" type="button" onClick={() => setFavoritesOpen(true)}>
                        Favorites
                      </button>
                      <Link className="btn-secondary px-4 py-2 text-sm" href="/portal/recipes">
                        Personalized recipes
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link className="btn-secondary px-4 py-2 text-sm" href="/login">
                        Sign in
                      </Link>
                      <Link className="btn-primary px-4 py-2 text-sm" href="/signup">
                        Create account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-10 lg:-mt-26">
            <section className="space-y-6">
              <div>
                <span className="eyebrow">Recipes</span>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold sm:text-5xl">
                  Browse supportive recipes without needing an account.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 muted">
                  Explore public recipes by condition, tags, ingredient triggers, and preparation time. Save favorites and unlock more personalized suggestions once you sign in.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
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
                {userId ? (
                  <button
                    type="button"
                    onClick={() => setFavoritesOpen(true)}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Favorites
                  </button>
                ) : null}
                {tab === "published" ? (
                  <Link
                    href="/recipes/shopping-list"
                    className={shoppingListCount > 0 ? "btn-secondary px-4 py-2 text-sm" : "btn-secondary px-4 py-2 text-sm"}
                  >
                    Shopping list{shoppingListCount > 0 ? ` (${shoppingListCount})` : ""}
                  </Link>
                ) : null}
              </div>
            </section>

            {userId ? (
              <section className="workspace-section">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="eyebrow">Recommended for you</span>
                    <h2 className="mt-3 text-2xl font-semibold">A personalized starting point based on recent check-ins.</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 muted">
                      These suggestions reflect recent foods, symptom patterns, and care signals you have been tracking. They are supportive meal ideas, not medical advice.
                    </p>
                  </div>
                  <Link href="/portal/recipes" className="btn-secondary px-4 py-2 text-sm">
                    Open in portal
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {loadingRecommended ? (
                    <div className="data-row border-t-0 text-sm muted">Loading recommendations...</div>
                  ) : recommendedRecipes.length === 0 ? (
                    <div className="data-row border-t-0">
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

            <section className="workspace-section">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    How to use this page
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Filter first, then compare recipe options side by side.</h2>
                </div>

                <div className="grid gap-3 text-sm leading-7 muted sm:text-base">
                  <p>Use the left menu to narrow recipes by condition support, nutrition tags, ingredients to avoid, and the amount of time you have available.</p>
                  <p>Public recipes stay open for browsing so patients and families can explore ideas before creating an account.</p>
                </div>
              </div>
            </section>

            {errorMessage ? <div className="data-row border-t-0 text-sm">Error: {errorMessage}</div> : null}

            {loadingVisible ? (
              <div className="data-row border-t-0 text-sm muted">Loading recipes...</div>
            ) : visibleRecipes.length === 0 ? (
              <div className="data-row border-t-0">
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
          </div>
        </div>
      </section>

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
      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-3 space-y-2">
        {options.map((option) => {
          const isSelected = selected.has(option.id);
          return (
            <label key={option.id} className="flex items-start gap-3 text-sm leading-6 text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(option.id)}
                className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
              />
              <span>{option.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CheckboxValueGroup({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-3 space-y-2">
        {values.map((value) => (
          <label key={value} className="flex items-start gap-3 text-sm leading-6 text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={selected.has(value)}
              onChange={() => onToggle(value)}
              className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
            />
            <span>{formatRecipeFacetLabel(value)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function PrepTimeGroup({
  maxPrepTime,
  onSelect,
}: {
  maxPrepTime: number | null;
  onSelect: React.Dispatch<React.SetStateAction<number | null>>;
}) {
  return (
    <div>
      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Prep time</div>
      <div className="mt-3 space-y-2">
        {[15, 30, 45].map((minutes) => (
          <label key={minutes} className="flex items-start gap-3 text-sm leading-6 text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={maxPrepTime === minutes}
              onChange={() => onSelect((current) => (current === minutes ? null : minutes))}
              className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
            />
            <span>{minutes} min or less</span>
          </label>
        ))}
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

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <div className="text-xs muted">Select recipes to build a printable, shareable shopping list.</div>
          <AddToShoppingListButton
            recipeId={recipe.id}
            className="rounded-full border border-[var(--border)] bg-white/72 px-4 py-2 text-xs font-semibold text-[var(--foreground)]"
          />
        </div>
    </div>
  );
}
