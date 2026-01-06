"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SaveToggle({
  recipeId,
  userId,
  isSaved,
  onChanged,
}: {
  recipeId: string;
  userId: string | null;
  isSaved: boolean;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!userId) return;

    setLoading(true);

    if (isSaved) {
      await supabase
        .from("recipe_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("recipe_id", recipeId);
    } else {
      await supabase
        .from("recipe_favorites")
        .insert({ user_id: userId, recipe_id: recipeId });
    }

    setLoading(false);
    onChanged();
  }

  return (
    <button
      type="button"
      className="border rounded px-2 py-1 text-sm"
      disabled={loading || !userId}
      onClick={toggle}
      title={!userId ? "Log in to save recipes" : isSaved ? "Unsave" : "Save"}
    >
      {loading ? "…" : isSaved ? "★" : "☆"}
    </button>
  );
}
