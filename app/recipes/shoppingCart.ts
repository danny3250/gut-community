"use client";

const STORAGE_KEY = "carebridge-recipe-shopping-list";

export type ShoppingListRecipeEntry = {
  recipeId: string;
  quantity: number;
};

function normalizeEntries(entries: ShoppingListRecipeEntry[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.recipeId) continue;
    const quantity = Number.isFinite(entry.quantity) ? Math.max(0, Math.floor(entry.quantity)) : 0;
    if (quantity <= 0) continue;
    counts.set(entry.recipeId, (counts.get(entry.recipeId) ?? 0) + quantity);
  }

  return Array.from(counts.entries()).map(([recipeId, quantity]) => ({ recipeId, quantity }));
}

export function readShoppingListEntries() {
  if (typeof window === "undefined") return [] as ShoppingListRecipeEntry[];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
      return normalizeEntries((parsed as string[]).map((recipeId) => ({ recipeId, quantity: 1 })));
    }

    if (!Array.isArray(parsed)) return [];

    return normalizeEntries(
      parsed
        .map((entry) =>
          entry && typeof entry === "object"
            ? { recipeId: String(entry.recipeId ?? ""), quantity: Number(entry.quantity ?? 0) }
            : null
        )
        .filter((entry): entry is ShoppingListRecipeEntry => Boolean(entry))
    );
  } catch {
    return [];
  }
}

export function readShoppingListRecipeIds() {
  return readShoppingListEntries().map((entry) => entry.recipeId);
}

export function getShoppingListCount() {
  return readShoppingListEntries().reduce((sum, entry) => sum + entry.quantity, 0);
}

export function getShoppingListQuantity(recipeId: string) {
  return readShoppingListEntries().find((entry) => entry.recipeId === recipeId)?.quantity ?? 0;
}

export function writeShoppingListEntries(entries: ShoppingListRecipeEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeEntries(entries)));
  window.dispatchEvent(new CustomEvent("carebridge-shopping-list-updated"));
}

export function addRecipeToShoppingList(recipeId: string, quantity = 1) {
  const current = readShoppingListEntries();
  const existing = current.find((entry) => entry.recipeId === recipeId);

  if (existing) {
    writeShoppingListEntries(
      current.map((entry) =>
        entry.recipeId === recipeId ? { ...entry, quantity: entry.quantity + quantity } : entry
      )
    );
    return;
  }

  writeShoppingListEntries([...current, { recipeId, quantity }]);
}

export function setRecipeQuantity(recipeId: string, quantity: number) {
  const current = readShoppingListEntries();
  const nextQuantity = Math.max(0, Math.floor(quantity));

  if (nextQuantity === 0) {
    writeShoppingListEntries(current.filter((entry) => entry.recipeId !== recipeId));
    return;
  }

  const exists = current.some((entry) => entry.recipeId === recipeId);
  if (!exists) {
    writeShoppingListEntries([...current, { recipeId, quantity: nextQuantity }]);
    return;
  }

  writeShoppingListEntries(
    current.map((entry) => (entry.recipeId === recipeId ? { ...entry, quantity: nextQuantity } : entry))
  );
}

export function clearShoppingListRecipeIds() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("carebridge-shopping-list-updated"));
}
