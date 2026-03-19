"use client";

import { useEffect, useState } from "react";
import { addRecipeToShoppingList, getShoppingListQuantity, setRecipeQuantity } from "./shoppingCart";

export default function AddToShoppingListButton({
  recipeId,
  className = "btn-secondary px-4 py-2 text-sm",
}: {
  recipeId: string;
  className?: string;
}) {
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    const syncQuantity = () => setQuantity(getShoppingListQuantity(recipeId));
    syncQuantity();

    window.addEventListener("carebridge-shopping-list-updated", syncQuantity as EventListener);
    window.addEventListener("storage", syncQuantity);

    return () => {
      window.removeEventListener("carebridge-shopping-list-updated", syncQuantity as EventListener);
      window.removeEventListener("storage", syncQuantity);
    };
  }, [recipeId]);

  function handleAdd() {
    addRecipeToShoppingList(recipeId);
    setQuantity(getShoppingListQuantity(recipeId));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={handleAdd} className={className}>
        {added ? "Added" : "Add to shopping list"}
      </button>

      {quantity > 0 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRecipeQuantity(recipeId, quantity - 1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white/72 text-sm font-semibold"
            aria-label="Remove one from shopping list"
          >
            -
          </button>
          <span className="min-w-5 text-center text-xs font-semibold text-[var(--accent-strong)]">{quantity}</span>
          <button
            type="button"
            onClick={() => setRecipeQuantity(recipeId, quantity + 1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white/72 text-sm font-semibold"
            aria-label="Add one more to shopping list"
          >
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}
