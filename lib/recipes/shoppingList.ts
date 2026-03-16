import { normalizeIngredientKey } from "@/lib/recipes/helpers";

export type ShoppingListIngredient = {
  ingredientName: string;
  unit: string | null;
  quantityNumeric: number | null;
  quantityText: string | null;
  rawText: string;
};

export type ShoppingListRow = {
  key: string;
  ingredientName: string;
  unit: string | null;
  quantityNumeric: number | null;
  quantityText: string;
  sourceCount: number;
  rawItems: string[];
};

export function buildShoppingList(items: ShoppingListIngredient[]) {
  const groups = new Map<string, ShoppingListRow>();

  for (const item of items) {
    const ingredientName = normalizeIngredientKey(item.ingredientName || item.rawText);
    const unit = item.unit?.toLowerCase().trim() || "";
    const key = `${ingredientName}__${unit}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        ingredientName: item.ingredientName || item.rawText,
        unit: item.unit,
        quantityNumeric: item.quantityNumeric,
        quantityText:
          item.quantityNumeric != null
            ? formatQuantity(item.quantityNumeric)
            : item.quantityText || item.rawText,
        sourceCount: 1,
        rawItems: [item.rawText],
      });
      continue;
    }

    const canAggregate =
      existing.quantityNumeric != null &&
      item.quantityNumeric != null &&
      existing.unit === item.unit;

    groups.set(key, {
      ...existing,
      quantityNumeric: canAggregate
        ? (existing.quantityNumeric ?? 0) + (item.quantityNumeric ?? 0)
        : null,
      quantityText: canAggregate
        ? formatQuantity((existing.quantityNumeric ?? 0) + (item.quantityNumeric ?? 0))
        : existing.quantityText,
      sourceCount: existing.sourceCount + 1,
      rawItems: [...existing.rawItems, item.rawText],
    });
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.ingredientName.localeCompare(b.ingredientName)
  );
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}
