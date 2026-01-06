"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FavoriteButton({
  recipeId,
  initialIsFav,
}: {
  recipeId: string;
  initialIsFav: boolean;
}) {
  const [isFav, setIsFav] = useState(initialIsFav);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    if (isFav) {
      await supabase.from("recipe_favorites").delete().eq("user_id", userId).eq("recipe_id", recipeId);
      setIsFav(false);
    } else {
      await supabase.from("recipe_favorites").insert({ user_id: userId, recipe_id: recipeId });
      setIsFav(true);
    }

    setLoading(false);
  }

  return (
    <button className="border rounded px-3 py-2" onClick={toggle} disabled={loading}>
      {loading ? "..." : isFav ? "★ Saved" : "☆ Save"}
    </button>
  );
}
