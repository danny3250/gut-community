"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type RecipeRow = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  ingredients: string;
  instructions: string;
  status: string;
};

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await params;
      setRecipeId(p.id);
    })();
  }, [params]);

  useEffect(() => {
    if (!recipeId) return;
    (async () => {
      setMsg(null);
      const { data, error } = await supabase
        .from("recipes")
        .select("id,title,description,servings,ingredients,instructions,status")
        .eq("id", recipeId)
        .single();

      if (error || !data) {
        setMsg(error?.message ?? "Could not load recipe.");
        setRecipe(null);
        return;
      }
      setRecipe(data as RecipeRow);
    })();
  }, [recipeId, supabase]);

  async function saveDraft() {
    if (!recipe) return;
    setSaving(true);
    setMsg(null);

    const { error } = await supabase
      .from("recipes")
      .update({
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        // keep as draft unless Review submits
        status: "draft",
        is_published: false,
      })
      .eq("id", recipe.id);

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Draft saved.");
  }

  if (!recipe) {
    return (
      <main className="p-6">
        <div className="font-medium">Edit Recipe</div>
        {msg && <pre className="mt-3 text-xs border rounded p-3 whitespace-pre-wrap">{msg}</pre>}
      </main>
    );
  }

  return (
    <main className="p-6 max-w-3xl space-y-4">
      <Link href="/recipes" className="text-sm opacity-70 hover:opacity-100">
        ← Back to Recipes
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Edit Draft</h1>
        <div className="text-sm opacity-70">
          Status: <span className="font-medium">{recipe.status}</span>
        </div>
      </header>

      {msg && <div className="text-sm border rounded p-3">{msg}</div>}

      <div className="space-y-3">
        <input
          className="w-full border rounded p-2"
          value={recipe.title}
          onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
        />

        <input
          className="w-full border rounded p-2"
          value={recipe.description ?? ""}
          placeholder="Short description"
          onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
        />

        <input
          className="w-full border rounded p-2"
          value={recipe.servings ?? ""}
          placeholder="Base servings (e.g. 4)"
          onChange={(e) => {
            const v = e.target.value.trim();
            const n = Number(v);
            setRecipe({ ...recipe, servings: v === "" ? null : Number.isFinite(n) ? n : null });
          }}
        />

        <textarea
          className="w-full border rounded p-2 min-h-[140px]"
          value={recipe.ingredients}
          onChange={(e) => setRecipe({ ...recipe, ingredients: e.target.value })}
        />

        <textarea
          className="w-full border rounded p-2 min-h-[180px]"
          value={recipe.instructions}
          onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <button className="border rounded px-3 py-2" onClick={saveDraft} disabled={saving} type="button">
          {saving ? "Saving…" : "Save Draft"}
        </button>

        <button
          className="border rounded px-3 py-2"
          onClick={() => router.push(`/recipes/${recipe.id}/review`)}
          type="button"
        >
          Review & Submit
        </button>
      </div>
    </main>
  );
}
