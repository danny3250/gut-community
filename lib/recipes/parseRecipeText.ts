import { parseIngredientsText } from "@/lib/ingredients/parse";
import { splitInstructionText } from "@/lib/recipes/helpers";
import { ParsedRecipeDraft } from "@/lib/recipes/types";

type ParseOptions = {
  mode?: "single" | "cookbook";
};

export function parseRecipeText(raw: string, options?: ParseOptions): ParsedRecipeDraft {
  const notes: string[] = [];
  const text = normalizeText(raw);

  if (!text) {
    return emptyResult(["No recipe text provided."]);
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (options?.mode === "cookbook") {
    notes.push("Cookbook mode is still importing one recipe at a time.");
  }

  const titleLine = findLineValue(lines, ["title"]) ?? lines[0] ?? "Imported Recipe";
  const title = stripFieldPrefix(titleLine, "title");

  const servings = extractNumber(lines, /\b(serves|servings?|yield|makes)\b/i, notes, "servings");
  const prepTimeMinutes = extractNumber(lines, /\bprep(\s+time)?\b/i, notes, "prep time");
  const cookTimeMinutes = extractNumber(lines, /\bcook(\s+time)?\b/i, notes, "cook time");
  const totalTimeMinutes = extractNumber(lines, /\btotal(\s+time)?\b/i, notes, "total time");

  const ingredientsBlock = extractSection(lines, ["ingredients"], ["instructions", "directions", "method", "notes", "digestion notes"]);
  const instructionsBlock = extractSection(lines, ["instructions", "directions", "method"], ["notes", "digestion notes"]);
  const notesBlock = extractSection(lines, ["notes"], ["digestion notes"]);
  const digestionNotesBlock = extractSection(lines, ["digestion notes"], []);

  const summary =
    findLineValue(lines, ["summary", "description"])?.replace(/^(summary|description)\s*:\s*/i, "") ??
    inferSummary(lines, titleLine);

  const ingredientsRaw = ingredientsBlock || inferIngredients(lines, titleLine);
  const instructionsRaw = instructionsBlock || inferInstructions(lines, ingredientsRaw);
  const notesText = notesBlock || null;
  const digestionNotes = digestionNotesBlock || null;

  const ingredients = parseIngredientsText(ingredientsRaw);
  const steps = splitInstructionText(instructionsRaw).map((body, index) => ({
    stepNumber: index + 1,
    body,
  }));

  let confidence: ParsedRecipeDraft["confidence"] = "low";
  if (ingredients.length > 0 && steps.length > 0) confidence = "medium";
  if (ingredientsBlock && instructionsBlock) confidence = "high";

  if (ingredientsBlock) notes.push("Detected ingredients section.");
  if (instructionsBlock) notes.push("Detected instructions section.");

  return {
    title,
    summary,
    servings,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    ingredientsRaw,
    instructionsRaw,
    notes: notesText,
    digestionNotes,
    ingredients,
    steps,
    confidence,
    parseNotes: notes,
  };
}

function normalizeText(raw: string) {
  return (raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function emptyResult(parseNotes: string[]): ParsedRecipeDraft {
  return {
    title: "Imported Recipe",
    summary: "",
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    totalTimeMinutes: null,
    ingredientsRaw: "",
    instructionsRaw: "",
    notes: null,
    digestionNotes: null,
    ingredients: [],
    steps: [],
    confidence: "low",
    parseNotes,
  };
}

function extractSection(lines: string[], headings: string[], stopHeadings: string[]) {
  const start = lines.findIndex((line) =>
    headings.some((heading) => line.toLowerCase().startsWith(heading))
  );

  if (start === -1) return "";

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const lower = lines[index].toLowerCase();
    if (stopHeadings.some((heading) => lower.startsWith(heading))) {
      end = index;
      break;
    }
  }

  return lines
    .slice(start + 1, end)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .join("\n")
    .trim();
}

function findLineValue(lines: string[], keys: string[]) {
  return lines.find((line) =>
    keys.some((key) => new RegExp(`^${key}\\s*:`, "i").test(line))
  );
}

function stripFieldPrefix(line: string, field: string) {
  return line.replace(new RegExp(`^${field}\\s*:\\s*`, "i"), "").trim();
}

function extractNumber(
  lines: string[],
  pattern: RegExp,
  notes: string[],
  label: string
) {
  const line = lines.find((entry) => pattern.test(entry));
  if (!line) return null;

  const match = line.match(/(\d{1,4})/);
  if (!match) return null;

  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  notes.push(`Detected ${label}: ${numeric}`);
  return numeric;
}

function inferSummary(lines: string[], titleLine: string) {
  const index = lines.indexOf(titleLine);
  const maybeSummary = lines[index + 1] ?? "";

  if (
    maybeSummary &&
    !/^(ingredients|instructions|directions|method|notes)\b/i.test(maybeSummary) &&
    maybeSummary.length <= 180
  ) {
    return maybeSummary;
  }

  return "";
}

function inferIngredients(lines: string[], titleLine: string) {
  const titleIndex = lines.indexOf(titleLine);
  const body = lines.slice(titleIndex + 1);
  const candidates = body.filter((line) => /^[-*\d]|pinch|dash|salt|pepper/i.test(line));
  return candidates.join("\n").trim();
}

function inferInstructions(lines: string[], ingredientsRaw: string) {
  if (!ingredientsRaw) return "";
  const ingredientLines = new Set(ingredientsRaw.split("\n").map((line) => line.trim()));

  return lines
    .filter((line) => !ingredientLines.has(line))
    .filter((line) => /\d+[\).\s-]+|[.!?]$/.test(line))
    .join("\n")
    .trim();
}
