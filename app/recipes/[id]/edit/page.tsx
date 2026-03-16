"use client";

import { useEffect, useState } from "react";
import RecipeWorkbench from "@/app/components/RecipeWorkbench";

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [recipeId, setRecipeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const resolved = await params;
      setRecipeId(resolved.id);
    })();
  }, [params]);

  if (!recipeId) {
    return (
      <main className="shell py-6 sm:py-10">
        <div className="panel px-5 py-4 text-sm muted">Loading recipe draft...</div>
      </main>
    );
  }

  return <RecipeWorkbench mode="manual" recipeId={recipeId} />;
}
