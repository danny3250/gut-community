import { RecipeIngredientDraft } from "@/lib/recipes/types";

const UNICODE_FRACTIONS: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
  "Â¼": "1/4",
  "Â½": "1/2",
  "Â¾": "3/4",
};

const UNITS = [
  "tsp",
  "tsps",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tbsps",
  "tablespoon",
  "tablespoons",
  "cup",
  "cups",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "g",
  "kg",
  "ml",
  "l",
  "clove",
  "cloves",
  "slice",
  "slices",
  "can",
  "cans",
  "package",
  "packages",
  "pinch",
  "dash",
];

export type ParsedIngredient = RecipeIngredientDraft & {
  confidence: number;
};

export function parseIngredientsText(text: string): ParsedIngredient[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseIngredientLine(line, index + 1));
}

export function parseIngredientLine(rawLine: string, sortOrder = 1): ParsedIngredient {
  const normalized = normalizeFractions(rawLine.replace(/^[-*]\s+/, "").trim());

  let rest = normalized;
  let quantityText: string | null = null;
  let quantityNumeric: number | null = null;

  const mixed = rest.match(/^(\d+\s+\d+\/\d+)\s+/);
  const hyphenMixed = rest.match(/^(\d+-\d+\/\d+)\s+/);
  const simple = rest.match(/^(\d+(\.\d+)?|\d+\/\d+)\s+/);

  const quantityMatch = mixed?.[1] ?? hyphenMixed?.[1] ?? simple?.[1] ?? null;

  if (quantityMatch) {
    quantityText = quantityMatch.replace("-", " ");
    quantityNumeric = parseIngredientQuantity(quantityText);
    rest = rest.slice(quantityMatch.length).trim();
  }

  let unit: string | null = null;
  const firstToken = rest.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (UNITS.includes(firstToken)) {
    unit = firstToken;
    rest = rest.split(/\s+/).slice(1).join(" ").trim();
  }

  let ingredientName = rest;
  let preparationNote: string | null = null;

  if (rest.includes(",")) {
    const [name, ...noteParts] = rest.split(",");
    ingredientName = name.trim();
    preparationNote = noteParts.join(",").trim() || null;
  } else if (/\bto taste\b/i.test(rest)) {
    ingredientName = rest.replace(/\bto taste\b/i, "").trim() || rest;
    preparationNote = "to taste";
  }

  const optionalFlag = /\boptional\b/i.test(rawLine);
  if (optionalFlag && !preparationNote) {
    preparationNote = "optional";
  }

  let confidence = 0.45;
  if (quantityText) confidence += 0.2;
  if (unit) confidence += 0.2;
  if (ingredientName) confidence += 0.15;

  return {
    sortOrder,
    rawText: rawLine.trim(),
    quantityNumeric,
    quantityText,
    unit,
    ingredientName: ingredientName || rawLine.trim(),
    preparationNote,
    optionalFlag,
    confidence: Math.min(confidence, 1),
  };
}

export function parseIngredientQuantity(value: string) {
  const trimmed = normalizeFractions(value).trim();

  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }

  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2]);
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeFractions(value: string) {
  let output = value;

  for (const [unicode, fraction] of Object.entries(UNICODE_FRACTIONS)) {
    output = output.replace(new RegExp(`(\\d)${escapeRegExp(unicode)}`, "g"), `$1 ${fraction}`);
    output = output.replaceAll(unicode, fraction);
  }

  return output;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
