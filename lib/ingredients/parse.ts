export type ParsedIngredient = {
  line_no: number;
  raw_line: string;
  quantity: number | null;
  unit: string | null;
  item_name: string | null;
  notes: string | null;
  category: string | null; // ✅ added
  confidence: number;
};


// Very simple MVP parser:
// - captures an optional leading quantity (including fractions like 1/2)
// - captures an optional unit word
// - remaining text becomes item_name/notes
export function parseIngredientsText(text: string): ParsedIngredient[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((raw, idx) => parseLine(raw, idx + 1));
}

function parseLine(raw: string, line_no: number): ParsedIngredient {
  // Examples handled:
  // "2 cups rice"
  // "1/2 tsp salt"
  // "1 lb chicken breast, diced"
  // "salt to taste" -> quantity/unit null
  const lower = raw.toLowerCase();

  const qtyMatch = raw.match(/^(\d+(\.\d+)?|\d+\/\d+)\s+/);
  let quantity: number | null = null;
  let rest = raw;

  if (qtyMatch) {
    const qtyStr = qtyMatch[1];
    quantity = parseQuantity(qtyStr);
    rest = raw.slice(qtyMatch[0].length).trim();
  }

  // common units (extend anytime)
  const units = [
    "tsp",
    "tbsp",
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
    "pinch",
    "dash",
    "can",
    "cans",
    "slice",
    "slices",
    "package",
    "packages",
  ];

  let unit: string | null = null;
  const firstWord = rest.split(/\s+/)[0]?.toLowerCase() ?? "";

  if (units.includes(firstWord)) {
    unit = firstWord;
    rest = rest.split(/\s+/).slice(1).join(" ").trim();
  }

  // split notes by comma (simple)
  let item_name: string | null = rest || null;
  let notes: string | null = null;

  if (rest.includes(",")) {
    const [a, ...b] = rest.split(",");
    item_name = a.trim() || null;
    notes = b.join(",").trim() || null;
  } else {
    // detect "to taste" / "optional" as notes
    if (lower.includes("to taste")) notes = "to taste";
    if (lower.includes("optional")) notes = notes ? `${notes}; optional` : "optional";
  }

  // confidence heuristic
  let confidence = 0.5;
  if (quantity !== null) confidence += 0.2;
  if (unit !== null) confidence += 0.2;
  if (item_name) confidence += 0.1;
  confidence = Math.min(1, confidence);

  return { line_no, raw_line: raw, quantity, unit, item_name, notes, category: null, confidence };
}

function parseQuantity(q: string): number | null {
  if (q.includes("/")) {
    const [a, b] = q.split("/");
    const num = Number(a);
    const den = Number(b);
    if (!isFinite(num) || !isFinite(den) || den === 0) return null;
    return num / den;
  }
  const n = Number(q);
  return isFinite(n) ? n : null;
}
