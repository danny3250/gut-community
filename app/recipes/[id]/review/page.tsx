"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseIngredientsText, ParsedIngredient } from "@/lib/ingredients/parse";

type RecipeRow = {
  id: string;
  title: string;
  ingredients: string;
  servings: number | null;
  status: string;
};

export default function ReviewIngredientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [rows, setRows] = useState<ParsedIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await params;
      setRecipeId(p.id);
    })();
  }, [params]);

  useEffect(() => {
    if (!recipeId) return;

    (async () => {
      setLoading(true);
      setMsg(null);

      const { data, error } = await supabase
        .from("recipes")
        .select("id,title,ingredients,servings,status")
        .eq("id", recipeId)
        .single();

      if (error || !data) {
        setMsg(error?.message ?? "Could not load recipe.");
        setRecipe(null);
        setRows([]);
        setLoading(false);
        return;
      }

      const r = data as RecipeRow;
      setRecipe(r);
      setRows(parseIngredientsText(r.ingredients));
      setLoading(false);
    })();
  }, [recipeId, supabase]);

  const canSave = useMemo(() => !loading && !!recipe && rows.length > 0, [loading, recipe, rows]);

  function updateRow(index: number, patch: Partial<ParsedIngredient>) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  async function saveStructuredOnly() {
    if (!recipe) return;
    setSaving(true);
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.id) {
      setSaving(false);
      setMsg("Not logged in.");
      return;
    }

    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);

    const insertRows = rows.map((r) => ({
      recipe_id: recipe.id,
      line_no: r.line_no,
      raw_line: r.raw_line,
      quantity: Number.isFinite(r.quantity as any) ? r.quantity : null,
      unit: r.unit,
      item_name: r.item_name,
      notes: r.notes,
      category: r.category ?? null,
      confidence: r.confidence,
    }));

    const { error: insErr } = await supabase.from("recipe_ingredients").insert(insertRows);

    setSaving(false);

    if (insErr) {
      setMsg(insErr.message);
      return;
    }

    router.push(`/recipes/${recipe.id}/edit`);
  }

  async function submitAndPublish() {
    if (!recipe) return;
    setSaving(true);
    setMsg(null);

    // 1) save structured ingredients
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.id) {
      setSaving(false);
      setMsg("Not logged in.");
      return;
    }

    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);

    const insertRows = rows.map((r) => ({
      recipe_id: recipe.id,
      line_no: r.line_no,
      raw_line: r.raw_line,
      quantity: Number.isFinite(r.quantity as any) ? r.quantity : null,
      unit: r.unit,
      item_name: r.item_name,
      notes: r.notes,
      category: r.category ?? null,
      confidence: r.confidence,
    }));

    const { error: insErr } = await supabase.from("recipe_ingredients").insert(insertRows);
    if (insErr) {
      setSaving(false);
      setMsg(insErr.message);
      return;
    }

    // 2) publish (ONLY HERE)
    const { error: pubErr } = await supabase
      .from("recipes")
      .update({ status: "published", is_published: true })
      .eq("id", recipe.id);

    setSaving(false);

    if (pubErr) {
      setMsg(pubErr.message);
      return;
    }

    router.push(`/recipes/${recipe.id}`);
  }

  if (loading) return <div className="p-6 text-sm opacity-70">Loading…</div>;

  if (!recipe) {
    return (
      <div className="p-6 space-y-3">
        <div className="font-medium">Could not load recipe.</div>
        {msg && <pre className="text-xs border rounded p-3 whitespace-pre-wrap">{msg}</pre>}
      </div>
    );
  }

  return (
    <main className="p-6 space-y-4 max-w-4xl">
      <Link href={`/recipes/${recipe.id}/edit`} className="text-sm opacity-70 hover:opacity-100">
        ← Back to Edit Recipe
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Review Ingredients</h1>
        <div className="text-sm opacity-80">
          Recipe: <span className="font-medium">{recipe.title}</span>
          {recipe.servings ? ` • Base servings: ${recipe.servings}` : ""}
        </div>
        <div className="text-sm opacity-70">
          Publishing is only possible from this page via <span className="font-medium">Submit & Publish</span>.
        </div>
      </header>

      {msg && <div className="text-sm border rounded p-3">{msg}</div>}

      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 w-12">#</th>
              <th className="text-left p-2 w-28">Qty</th>
              <th className="text-left p-2 w-28">Unit</th>
              <th className="text-left p-2">Item</th>
              <th className="text-left p-2">Notes</th>
              <th className="text-left p-2 w-20">Conf</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.line_no} className="border-b">
                <td className="p-2 opacity-70">{r.line_no}</td>

                <td className="p-2">
                  <input
                    className="w-full border rounded p-1"
                    value={Number.isFinite(r.quantity) ? String(r.quantity) : ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (v === "") return updateRow(idx, { quantity: null });
                      const n = Number(v);
                      updateRow(idx, { quantity: Number.isFinite(n) ? n : null });
                    }}
                    placeholder="e.g. 2"
                  />
                </td>

                <td className="p-2">
                  <input
                    className="w-full border rounded p-1"
                    value={r.unit ?? ""}
                    onChange={(e) => updateRow(idx, { unit: e.target.value || null })}
                    placeholder="e.g. cup"
                  />
                </td>

                <td className="p-2">
                  <input
                    className="w-full border rounded p-1"
                    value={r.item_name ?? ""}
                    onChange={(e) => updateRow(idx, { item_name: e.target.value || null })}
                    placeholder="e.g. rice"
                  />
                  <div className="text-xs opacity-60 mt-1">Raw: {r.raw_line}</div>
                </td>

                <td className="p-2">
                  <input
                    className="w-full border rounded p-1"
                    value={r.notes ?? ""}
                    onChange={(e) => updateRow(idx, { notes: e.target.value || null })}
                    placeholder="e.g. diced"
                  />
                </td>

                <td className="p-2 opacity-70">{Math.round(r.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="border rounded px-3 py-2" disabled={!canSave || saving} onClick={saveStructuredOnly} type="button">
          {saving ? "Saving…" : "Save as Draft"}
        </button>

        <button className="border rounded px-3 py-2" disabled={!canSave || saving} onClick={submitAndPublish} type="button">
          {saving ? "Submitting…" : "Submit & Publish"}
        </button>
      </div>
    </main>
  );
}
