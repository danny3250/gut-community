import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FavoriteButton from "./FavoriteButton"; 

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  ingredients: string;
  instructions: string;
  servings: number | null;
  status: string;
  created_by: string;
};

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id: recipeId } = await params;

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id,title,description,ingredients,instructions,servings,status,created_by")
    .eq("id", recipeId)
    .single<Recipe>();

  if (error || !recipe) {
    return <div className="p-6">Recipe not found.</div>;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user?.id && user.id === recipe.created_by;

  // If draft and not owner, hide it
  if (recipe.status !== "published" && !isOwner) {
    return <div className="p-6">Recipe not found.</div>;
  }

  // Favorites only meaningful for published (optional rule)
  let isFav = false;
  if (user?.id && recipe.status === "published") {
    const { data: fav } = await supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipe.id)
      .maybeSingle();

    isFav = !!fav;
  }

  return (
    <main className="p-6 space-y-6 max-w-3xl">
      <Link href="/recipes" className="text-sm opacity-70 hover:opacity-100">
        ← Back to Recipes
      </Link>

      {recipe.status !== "published" && isOwner && (
        <div className="border rounded p-3">
          <div className="font-medium">Draft</div>
          <div className="text-sm opacity-80 mt-1">
            This recipe is not published yet. Only you can see it.
          </div>
          <div className="flex gap-2 mt-3">
            <Link className="border rounded px-3 py-2 text-sm" href={`/recipes/${recipe.id}/edit`}>
              Edit Draft
            </Link>
            <Link className="border rounded px-3 py-2 text-sm" href={`/recipes/${recipe.id}/review`}>
              Review & Submit
            </Link>
          </div>
        </div>
      )}

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{recipe.title}</h1>
          {recipe.description && <p className="opacity-80 mt-2">{recipe.description}</p>}
          {recipe.servings != null && (
            <div className="text-sm opacity-70 mt-2">Base servings: {recipe.servings}</div>
          )}
        </div>

        {recipe.status === "published" ? (
          <FavoriteButton recipeId={recipe.id} initialIsFav={isFav} />
        ) : null}
      </header>

      <section>
        <h2 className="text-lg font-medium">Ingredients</h2>
        <pre className="whitespace-pre-wrap mt-2 border rounded p-3">{recipe.ingredients}</pre>
      </section>

      <section>
        <h2 className="text-lg font-medium">Instructions</h2>
        <pre className="whitespace-pre-wrap mt-2 border rounded p-3">{recipe.instructions}</pre>
      </section>
    </main>
  );
}
