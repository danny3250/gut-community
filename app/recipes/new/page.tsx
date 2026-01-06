"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewRecipePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState<string>("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  setMsg(null);

  // Which button was clicked?
  const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
  const next = submitter?.value ?? "edit"; // "edit" or "review"

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    setLoading(false);
    setMsg("Not logged in.");
    return;
  }

  const parsedServings =
    servings.trim() === ""
      ? null
      : Number.isFinite(Number(servings))
      ? Number(servings)
      : null;

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      created_by: userId,
      title,
      description,
      servings: parsedServings,
      ingredients,
      instructions,
      status: "draft",
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !recipe) {
    setLoading(false);
    setMsg(error?.message ?? "Failed to create draft.");
    return;
  }

  setLoading(false);
  router.push(`/recipes/${recipe.id}/review`);
}


  return (
    <main className="p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Create Recipe Draft</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Base servings (e.g. 4)"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />

        <textarea
          className="w-full border rounded p-2 min-h-[120px]"
          placeholder="Ingredients (one per line)"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          required
        />

        <textarea
          className="w-full border rounded p-2 min-h-[160px]"
          placeholder="Instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          required
        />

        <button
            className="border rounded px-3 py-2"
            disabled={loading}
            type="submit"
            name="action"
            value="review"
            >
            {loading ? "Creating…" : "Review"}
            </button>

            {msg && <p className="text-sm">{msg}</p>}


      </form>
    </main>
  );
}
