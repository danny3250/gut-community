"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function PrintRecipeActions() {
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (hasPrintedRef.current) return;
    hasPrintedRef.current = true;

    const timer = window.setTimeout(() => {
      window.print();
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="recipe-print-actions flex flex-wrap gap-3">
      <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => window.print()}>
        Print
      </button>
      <Link href="/recipes" className="btn-secondary px-4 py-2 text-sm">
        Back to recipes
      </Link>
    </div>
  );
}
