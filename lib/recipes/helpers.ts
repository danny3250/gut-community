export function slugifyRecipeTitle(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `recipe-${Date.now().toString(36)}`;
}

export function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

export function splitInstructionText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+[\).\s-]+/, "").trim())
    .filter(Boolean);
}

export function normalizeIngredientKey(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ");
}
