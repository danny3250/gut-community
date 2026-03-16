export type RecipeIngredientDraft = {
  sortOrder: number;
  rawText: string;
  quantityNumeric: number | null;
  quantityText: string | null;
  unit: string | null;
  ingredientName: string;
  preparationNote: string | null;
  optionalFlag: boolean;
};

export type RecipeStepDraft = {
  stepNumber: number;
  body: string;
};

export type RecipeDraftInput = {
  recipeId?: string;
  createdBy?: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  ingredientsRaw: string;
  instructionsRaw: string;
  notes: string | null;
  digestionNotes: string | null;
  isPublic: boolean;
  status: "draft" | "published";
  tagIds: string[];
  ingredients: RecipeIngredientDraft[];
  steps: RecipeStepDraft[];
};

export type ParsedRecipeDraft = {
  title: string;
  summary: string;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  ingredientsRaw: string;
  instructionsRaw: string;
  notes: string | null;
  digestionNotes: string | null;
  ingredients: RecipeIngredientDraft[];
  steps: RecipeStepDraft[];
  confidence: "high" | "medium" | "low";
  parseNotes: string[];
};
