"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRecipesByConditions } from "@/lib/recipes/queries";
import FavoritesDrawer from "./FavoritesDrawer";
import SaveToggle from "./SaveToggle";

type Tag = { id: string; name: string; slug: string };
type Condition = { id: string; name: string; slug: string };

type RecipeRow = {
  id: string;
  slug?: string | null;
  title: string;
  name?: string | null;
  summary: string | null;
  description: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  tags?: string[];
  conditions_supported?: string[];
  ingredient_ids?: string[];
  why_this_helps?: string | null;
  created_at: string;
  status: "draft" | "published" | string;
  created_by?: string;
};

const TAG_MAP_TABLE = "recipe_tag_map";

function formatMinutes(value: number | null) {
  if (value == null) return null;
  return `${value} min`;
}

export default function RecipesPage() {
  const supabase = createClient();

  const [tab, setTab] = useState<"published" | "drafts">("published");
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favOpen, setFavOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
  const [published, setPublished] = useState<RecipeRow[]>([]);
  const [drafts, setDrafts] = useState<RecipeRow[]>([]);
  const [tagsByRecipe, setTagsByRecipe] = useState<Record<string, Tag[]>>({});
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const selectedConditionIds = useMemo(() => Array.from(selectedConditions), [selectedConditions]);
  const selectedTagSlugs = useMemo(
    () => tags.filter((tag) => selected.has(tag.id)).map((tag) => tag.slug),
    [selected, tags]
  );

  function toggleCondition(id: string) {
    setSelectedConditions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTag(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("recipe_tags").select("id,name,slug").order("name");
      if (!error) setTags((data ?? []) as Tag[]);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("conditions").select("id,name,slug").order("name");
      if (!error) setConditions((data ?? []) as Condition[]);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!userId && tab === "drafts") {
      setTab("published");
    }
  }, [tab, userId]);

  async function refreshFavorites(currentUserId?: string | null) {
    const id = currentUserId ?? userId;
    if (!id) {
      setFavoriteIds(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("user_id", id);

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
    refreshFavorites(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setDrafts([]);
      setLoadingDrafts(false);
      return;
    }

    (async () => {
      setLoadingDrafts(true);
      const { data, error } = await supabase
        .from("recipes")
        .select("id,title,summary,description,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,created_at,status,created_by")
        .eq("status", "draft")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (!error) setDrafts((data ?? []) as RecipeRow[]);
      setLoadingDrafts(false);
    })();
  }, [supabase, userId]);

  useEffect(() => {
    (async () => {
      setLoadingPublished(true);
      setErr(null);

      const selectedConditionSlugs = conditions
        .filter((condition) => selectedConditions.has(condition.id))
        .map((condition) => condition.slug);

      if (selectedConditionSlugs.length > 0) {
        const { data: avoidRows, error: avoidError } = await supabase
          .from("ingredient_avoidance")
          .select("ingredient_id")
          .in("condition_id", selectedConditionIds);

        if (avoidError) {
          setErr(avoidError.message);
          setPublished([]);
          setLoadingPublished(false);
          return;
        }

        try {
          const rows = await getRecipesByConditions(
            supabase,
            selectedConditionSlugs,
            (avoidRows ?? [])
              .map((row: { ingredient_id: string | null }) => row.ingredient_id)
              .filter((value): value is string => typeof value === "string" && value.length > 0)
          );

          const filteredByTags =
            selectedTagSlugs.length === 0
              ? rows
              : rows.filter((row) => selectedTagSlugs.every((slug) => row.tags.includes(slug)));

          setPublished(
            filteredByTags.map((row) => ({
              ...row,
              title: row.name ?? row.title ?? "Recipe",
              summary: row.summary ?? row.description ?? null,
              description: row.description ?? null,
            })) as RecipeRow[]
          );
        } catch (error) {
          setErr(error instanceof Error ? error.message : "Could not filter recipes.");
          setPublished([]);
        }

        setLoadingPublished(false);
        return;
      }

      if (selectedIds.length === 0) {
        const { data, error } = await supabase
          .from("recipes")
          .select("id,slug,title,name,summary,description,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,tags,conditions_supported,ingredient_ids,why_this_helps,created_at,status")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(60);

        if (error) setErr(error.message);
        setPublished((data ?? []) as RecipeRow[]);
        setLoadingPublished(false);
        return;
      }

      const { data: mapRows, error: mapErr } = await supabase
        .from(TAG_MAP_TABLE)
        .select("recipe_id, tag_id")
        .in("tag_id", selectedIds);

      if (mapErr) {
        setErr(mapErr.message);
        setPublished([]);
        setLoadingPublished(false);
        return;
      }

      const matchingRecipeIds = Array.from(
        new Set(
          (mapRows ?? [])
            .map((row: { recipe_id: string }) => row.recipe_id)
            .filter((value) => typeof value === "string" && value.length > 0)
        )
      );

      if (matchingRecipeIds.length === 0) {
        setPublished([]);
        setLoadingPublished(false);
        return;
      }

      const { data: recipesData, error: recipesErr } = await supabase
        .from("recipes")
        .select("id,slug,title,name,summary,description,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,tags,conditions_supported,ingredient_ids,why_this_helps,created_at,status")
        .eq("status", "published")
        .in("id", matchingRecipeIds)
        .order("created_at", { ascending: false });

      if (recipesErr) setErr(recipesErr.message);
      setPublished((recipesData ?? []) as RecipeRow[]);
      setLoadingPublished(false);
    })();
  }, [conditions, selectedConditionIds, selectedConditions, selectedIds, selectedTagSlugs, supabase]);

  useEffect(() => {
    const recipeIds = published.map((recipe) => recipe.id);
    if (recipeIds.length === 0) {
      setTagsByRecipe({});
      return;
    }

    (async () => {
      const { data: mapRows } = await supabase
        .from("recipe_tag_map")
        .select("recipe_id,tag_id")
        .in("recipe_id", recipeIds);

      if (!mapRows || mapRows.length === 0) {
        setTagsByRecipe({});
        return;
      }

      const tagIds = Array.from(new Set(mapRows.map((row: { tag_id: string }) => row.tag_id)));
      const { data: tagRows } = await supabase.from("recipe_tags").select("id,name,slug").in("id", tagIds);
      const tagMap = new Map((tagRows ?? []).map((row: Tag) => [row.id, row]));
      const next: Record<string, Tag[]> = {};

      for (const row of mapRows as { recipe_id: string; tag_id: string }[]) {
        const tag = tagMap.get(row.tag_id);
        if (!tag) continue;
        next[row.recipe_id] = [...(next[row.recipe_id] ?? []), tag];
      }

      setTagsByRecipe(next);
    })();
  }, [published, supabase]);

  const visible = tab === "published" ? published : drafts;
  const isLoading = tab === "published" ? loadingPublished : loadingDrafts;

  return (
    <main className="shell space-y-6 py-6 sm:py-10">
      <section className="panel flex flex-col gap-6 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <span className="eyebrow">Recipe library</span>
          <h1 className="mt-4 text-4xl font-semibold">Recipes for the days when eating feels harder than it should.</h1>
          <p className="mt-3 text-sm leading-6 muted sm:text-base">
            Browse public recipes built to be practical, readable, and easy to come back to when your
            stomach feels unpredictable. Members can save favorites, keep drafts, and grow into more
            supportive planning tools over time.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {userId ? (
            <>
              <button className="btn-secondary" type="button" onClick={() => setFavOpen(true)}>
                Favorites
              </button>
              <Link className="btn-primary" href="/app/admin/recipes/new">
                Add recipe
              </Link>
            </>
          ) : (
            <Link className="btn-primary" href="/signup">
              Join members
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel px-5 py-5 sm:px-6">
          <div className="text-sm font-semibold">What you can do here</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoCard
              title="Browse publicly"
              body="Most recipes stay open to everyone so helpful meal ideas are easy to reach without a login."
            />
            <InfoCard
              title="Filter simply"
              body="Use tags like gluten-free, low-spice, or gentle-digestion to narrow things down quickly."
            />
            <InfoCard
              title="Save what helps"
              body="Members can keep favorite recipes close instead of searching for the same meals again."
            />
            <InfoCard
              title="Build from there"
              body="The recipe system is set up to support future shopping lists, collections, and recommendations."
            />
          </div>
        </div>

        <div className="panel px-5 py-5 sm:px-6">
          <div className="text-sm font-semibold">Recipe philosophy</div>
          <div className="mt-4 space-y-3 text-sm leading-6 muted">
            <p>
              CareBridge recipes are meant to feel useful in real life. That means clearer ingredient
              lists, supportive tags, and less pressure to cook perfectly.
            </p>
            <p>
              They are here to help with meal ideas and planning, not to diagnose conditions or promise that
              one way of eating works for everyone.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/resources" className="btn-secondary px-4 py-2 text-sm">
              Browse resources
            </Link>
            {!userId ? (
              <Link href="/signup" className="btn-secondary px-4 py-2 text-sm">
                Join members
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel px-5 py-5 sm:px-6">
          <div className="text-sm font-semibold">Filter by conditions</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {conditions.map((condition) => {
              const checked = selectedConditions.has(condition.id);
              return (
                <button
                  key={condition.id}
                  type="button"
                  onClick={() => toggleCondition(condition.id)}
                  className={
                    checked
                      ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                  }
                >
                  {condition.name}
                </button>
              );
            })}
          </div>
          <div className="mt-5 text-sm font-semibold">Filter by tags</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => {
              const checked = selected.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={
                    checked
                      ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                  }
                >
                  {tag.name}
                </button>
              );
            })}

            {selected.size > 0 || selectedConditions.size > 0 ? (
              <button
                type="button"
                className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                onClick={() => {
                  setSelected(new Set());
                  setSelectedConditions(new Set());
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div className="mt-3 text-xs muted">
            Condition filters use denormalized recipe fields for fast reads, while the relational tables stay as the source of truth behind the scenes.
          </div>
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
          <p className="mt-4 text-sm leading-6 muted">
            {tab === "published"
              ? "Published recipes are public, readable, and structured for filtering."
              : "Drafts stay private until you review and publish them."}
          </p>
        </div>
      </section>

      {err ? <div className="panel px-5 py-4 text-sm">Error: {err}</div> : null}

      {isLoading ? (
        <div className="panel px-5 py-4 text-sm muted">Loading recipes...</div>
      ) : visible.length === 0 ? (
        <div className="panel px-5 py-4 text-sm muted">
          {tab === "published"
            ? "No public recipes match those filters yet."
            : "You do not have any drafts yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((recipe) => {
            const cardTags = tagsByRecipe[recipe.id] ?? [];
            const summary = recipe.summary ?? recipe.description;
            const meta = [
              recipe.servings != null ? `Serves ${recipe.servings}` : null,
              formatMinutes(recipe.prep_time_minutes) ? `Prep ${formatMinutes(recipe.prep_time_minutes)}` : null,
              formatMinutes(recipe.total_time_minutes) ? `Total ${formatMinutes(recipe.total_time_minutes)}` : null,
            ].filter(Boolean);

            return (
              <div key={recipe.id} className="panel px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {tab === "published" ? (
                      <Link href={`/recipes/${recipe.id}`} className="block">
                        <div className="text-xl font-semibold">{recipe.title}</div>
                        {summary ? (
                          <div className="mt-2 line-clamp-3 text-sm leading-6 muted">{summary}</div>
                        ) : null}

                        {meta.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            {meta.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-[var(--border)] px-3 py-1 opacity-80"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {cardTags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {cardTags.slice(0, 4).map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-strong)]"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {recipe.why_this_helps ? (
                          <div className="mt-3 text-sm leading-6 muted">{recipe.why_this_helps}</div>
                        ) : null}

                        <div className="mt-4 text-xs opacity-60">
                          {new Date(recipe.created_at).toLocaleDateString()}
                        </div>
                      </Link>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="text-xl font-semibold">{recipe.title}</div>
                          <span className="rounded-full bg-[var(--warm)] px-3 py-1 text-xs font-semibold">
                            Draft
                          </span>
                        </div>

                        {summary ? (
                          <div className="mt-2 line-clamp-3 text-sm leading-6 muted">{summary}</div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link className="btn-secondary px-4 py-2 text-sm" href={`/recipes/${recipe.id}/edit`}>
                            Edit
                          </Link>
                          <Link className="btn-secondary px-4 py-2 text-sm" href={`/recipes/${recipe.id}/review`}>
                            Review
                          </Link>
                        </div>
                      </>
                    )}
                  </div>

                  {tab === "published" && userId ? (
                    <SaveToggle
                      recipeId={recipe.id}
                      userId={userId}
                      isSaved={favoriteIds.has(recipe.id)}
                      onChanged={() => refreshFavorites()}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {userId && tab === "published" ? (
        <FavoritesDrawer open={favOpen} onClose={() => setFavOpen(false)} />
      ) : null}
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
    </div>
  );
}
