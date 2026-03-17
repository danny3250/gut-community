import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRecipeFacetLabel } from "@/lib/carebridge/recipes";
import { getRecommendedRecipesForUser } from "@/lib/carebridge/recommendations";

function formatMinutes(value: number | null) {
  if (value == null) return null;
  return `${value} min`;
}

export default async function PortalRecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const recommendedRecipes = await getRecommendedRecipesForUser(user.id, 6);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Recipes</span>
            <h1 className="mt-4 text-3xl font-semibold">Recommended recipes shaped by your recent check-ins.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 muted">
              This section blends recent check-ins with visit guidance when available to highlight supportive meal ideas. It is a practical starting point, not medical advice.
            </p>
          </div>
          <Link href="/recipes" className="btn-secondary">
            Browse all recipes
          </Link>
        </div>
      </section>

      {recommendedRecipes.length === 0 ? (
        <section className="panel px-6 py-6 sm:px-8">
          <h2 className="text-xl font-semibold">No recommendations yet.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 muted">
            Start logging your daily health to get personalized recommendations, or give CareBridge a little more time to learn from your care history.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/portal/check-in" className="btn-primary">
              Complete a check-in
            </Link>
            <Link href="/recipes" className="btn-secondary">
              Browse all recipes
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {recommendedRecipes.map((recipe) => {
            const meta = [
              recipe.prep_time_minutes != null ? `Prep ${formatMinutes(recipe.prep_time_minutes)}` : null,
              recipe.total_time_minutes != null ? `Total ${formatMinutes(recipe.total_time_minutes)}` : null,
              recipe.difficulty ? formatRecipeFacetLabel(recipe.difficulty) : null,
            ].filter(Boolean);

            return (
              <Link key={recipe.id} href={`/recipes/${recipe.slug}`} className="panel block px-5 py-5 hover:-translate-y-0.5">
                <div className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {recipe.recommendation_reason}
                </div>
                <div className="mt-3 text-2xl font-semibold">{recipe.title}</div>
                {recipe.summary ? <p className="mt-2 text-sm leading-6 muted">{recipe.summary}</p> : null}

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
                      <span key={condition} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                        {formatRecipeFacetLabel(condition)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {recipe.why_this_helps ? (
                  <div className="mt-3 text-sm leading-6 muted">{recipe.why_this_helps}</div>
                ) : null}
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
