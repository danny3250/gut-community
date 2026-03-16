import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { splitInstructionText } from "@/lib/recipes/helpers";
import FavoriteButton from "./FavoriteButton";

type Nutrition = {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
};

type RecipeRecord = {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  ingredients_raw: string | null;
  instructions_raw: string | null;
  ingredients: string | null;
  instructions: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  notes: string | null;
  digestion_notes: string | null;
  status: string;
  created_by: string;
  image_url?: string | null;
  photo_url?: string | null;
  nutrition?: Nutrition | null;
};

type TagRow = {
  id: string;
  name: string;
};

type IngredientRow = {
  sort_order: number | null;
  raw_text: string | null;
  raw_line: string | null;
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

function splitLines(block: string | null) {
  return (block ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatIngredient(row: IngredientRow) {
  const quantity = row.quantity_text?.trim();
  const unit = row.unit?.trim();
  const name = row.ingredient_name?.trim() || row.item_name?.trim() || row.raw_text?.trim() || row.raw_line?.trim() || "";
  const note = row.preparation_note?.trim() || row.notes?.trim();
  const optional = row.optional_flag ? "optional" : null;
  const suffix = [note, optional].filter(Boolean).join(", ");
  return [quantity, unit, name].filter(Boolean).join(" ") + (suffix ? `, ${suffix}` : "");
}

function formatMinutes(value: number | null | undefined) {
  if (value == null) return null;
  return `${value} min`;
}

function NutItem({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/70 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] opacity-60">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id: recipeId } = await params;

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(
      "id,title,slug,summary,description,ingredients_raw,instructions_raw,ingredients,instructions,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,notes,digestion_notes,status,created_by,image_url,photo_url,nutrition"
    )
    .eq("id", recipeId)
    .single<RecipeRecord>();

  if (error || !recipe) {
    return (
      <main className="shell py-6 sm:py-10">
        <div className="panel px-6 py-4 text-sm">Recipe not found.</div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = Boolean(user?.id && user.id === recipe.created_by);

  if (recipe.status !== "published" && !isOwner) {
    return (
      <main className="shell py-6 sm:py-10">
        <div className="panel px-6 py-4 text-sm">Recipe not found.</div>
      </main>
    );
  }

  const [{ data: ingredientRows }, { data: stepRows }, { data: links }] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("sort_order,raw_text,raw_line,quantity_text,unit,ingredient_name,item_name,preparation_note,notes,optional_flag")
      .eq("recipe_id", recipe.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("recipe_steps")
      .select("step_number,body")
      .eq("recipe_id", recipe.id)
      .order("step_number", { ascending: true }),
    supabase.from("recipe_tag_map").select("tag_id").eq("recipe_id", recipe.id),
  ]);

  const tagIds = (links ?? []).map((row: { tag_id: string }) => row.tag_id);
  let tags: TagRow[] = [];
  if (tagIds.length > 0) {
    const { data: tagRows } = await supabase
      .from("recipe_tags")
      .select("id,name")
      .in("id", tagIds)
      .order("name", { ascending: true });
    tags = (tagRows ?? []) as TagRow[];
  }

  let isFav = false;
  if (user?.id && recipe.status === "published") {
    const { data: fav } = await supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipe.id)
      .maybeSingle();
    isFav = Boolean(fav);
  }

  const ingredients =
    ingredientRows && ingredientRows.length > 0
      ? (ingredientRows as IngredientRow[]).map(formatIngredient).filter(Boolean)
      : splitLines(recipe.ingredients_raw || recipe.ingredients);

  const steps =
    stepRows && stepRows.length > 0
      ? (stepRows as StepRow[]).map((row) => row.body).filter(Boolean)
      : splitInstructionText(recipe.instructions_raw || recipe.instructions || "");

  const summary = recipe.summary ?? recipe.description;
  const imageUrl = recipe.image_url ?? recipe.photo_url;
  const nutrition = (recipe.nutrition ?? {}) as Nutrition;
  const hasNutrition = Object.values(nutrition).some((value) => value != null);
  const metaItems = [
    recipe.servings != null ? `Serves ${recipe.servings}` : null,
    formatMinutes(recipe.prep_time_minutes) ? `Prep ${formatMinutes(recipe.prep_time_minutes)}` : null,
    formatMinutes(recipe.cook_time_minutes) ? `Cook ${formatMinutes(recipe.cook_time_minutes)}` : null,
    formatMinutes(recipe.total_time_minutes) ? `Total ${formatMinutes(recipe.total_time_minutes)}` : null,
  ].filter(Boolean);

  return (
    <main className="shell max-w-5xl space-y-6 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/recipes" className="text-sm muted hover:text-[var(--foreground)]">
          Back to recipes
        </Link>
        {recipe.status === "published" ? (
          <FavoriteButton recipeId={recipe.id} initialIsFav={isFav} />
        ) : null}
      </div>

      {recipe.status !== "published" && isOwner && (
        <div className="panel px-5 py-4">
          <div className="font-medium">Draft recipe</div>
          <div className="mt-1 text-sm muted">
            This recipe is still private. Review the structure and publish when it reads cleanly.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn-secondary px-4 py-2 text-sm" href={`/recipes/${recipe.id}/edit`}>
              Edit draft
            </Link>
            <Link className="btn-secondary px-4 py-2 text-sm" href={`/recipes/${recipe.id}/review`}>
              Review and publish
            </Link>
          </div>
        </div>
      )}

      <header className="panel overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={recipe.title} className="max-h-[340px] w-full object-cover" />
        ) : (
          <div className="flex h-[180px] w-full items-center justify-center bg-[var(--warm)]/40 text-sm opacity-60">
            Photo coming soon
          </div>
        )}

        <div className="space-y-4 p-6 sm:p-7">
          <div className="space-y-2">
            <span className="eyebrow">Recipe</span>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{recipe.title}</h1>
            {summary ? <p className="max-w-3xl text-sm leading-6 muted sm:text-base">{summary}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {metaItems.map((item) => (
              <span key={item} className="rounded-full border border-[var(--border)] px-3 py-1 opacity-80">
                {item}
              </span>
            ))}
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent-strong)]"
              >
                {tag.name}
              </span>
            ))}
          </div>

          {isOwner ? (
            <div className="pt-1">
              <Link className="text-sm font-semibold text-[var(--accent-strong)]" href={`/recipes/${recipe.id}/edit`}>
                Edit recipe details
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {hasNutrition ? (
        <section className="panel px-5 py-5">
          <h2 className="text-lg font-medium">Nutrition (per serving)</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <NutItem label="Calories" value={nutrition.calories} />
            <NutItem label="Protein (g)" value={nutrition.protein_g} />
            <NutItem label="Carbs (g)" value={nutrition.carbs_g} />
            <NutItem label="Fat (g)" value={nutrition.fat_g} />
            <NutItem label="Fiber (g)" value={nutrition.fiber_g} />
            <NutItem label="Sugar (g)" value={nutrition.sugar_g} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel px-5 py-5">
          <h2 className="text-lg font-medium">Ingredients</h2>
          {ingredients.length === 0 ? (
            <p className="mt-2 text-sm muted">No ingredients listed yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ingredients.map((line, index) => (
                <li key={`${line}-${index}`} className="flex gap-3 text-sm leading-6 sm:text-base">
                  <span className="mt-[0.55rem] h-2 w-2 rounded-full bg-[var(--accent)]/70" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel px-5 py-5">
          <h2 className="text-lg font-medium">Instructions</h2>
          {steps.length === 0 ? (
            <p className="mt-2 text-sm muted">No instructions listed yet.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {steps.map((step, index) => (
                <li key={`${step}-${index}`} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 sm:text-base">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {(recipe.digestion_notes || recipe.notes) ? (
        <section className="grid gap-6 md:grid-cols-2">
          {recipe.digestion_notes ? (
            <div className="panel px-5 py-5">
              <h2 className="text-lg font-medium">Digestion notes</h2>
              <p className="mt-3 text-sm leading-6 muted sm:text-base">{recipe.digestion_notes}</p>
            </div>
          ) : null}

          {recipe.notes ? (
            <div className="panel px-5 py-5">
              <h2 className="text-lg font-medium">Notes</h2>
              <p className="mt-3 text-sm leading-6 muted sm:text-base">{recipe.notes}</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
