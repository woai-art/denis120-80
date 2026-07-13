"use client";

import { useState, useTransition } from "react";
import { addMyProduct } from "@/lib/actions";
import { scaleNutrition } from "@/lib/nutrition";
import type { UserProduct } from "@/lib/user-products";

const MEAL_TYPES = [
  { value: "breakfast", label: "Завтрак" },
  { value: "main", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
] as const;

export function MyProductsQuickAdd({ products }: { products: UserProduct[] }) {
  const [gramsById, setGramsById] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((p) => [p.id, p.defaultGrams])),
  );
  const [mealType, setMealType] = useState<string>("main");
  const [isPending, startTransition] = useTransition();
  const [addedId, setAddedId] = useState<string | null>(null);

  if (products.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Пока пусто. Добавь продукт вручную или по штрих-коду — он появится здесь
        для повторного выбора.
      </p>
    );
  }

  function handleAdd(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const grams = gramsById[productId] ?? product.defaultGrams;
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("grams", String(grams));
    formData.set("mealType", mealType);
    startTransition(async () => {
      await addMyProduct(formData);
      setAddedId(productId);
      setTimeout(() => setAddedId(null), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Всё, что уже вводил — здесь. Выбери приём пищи, граммы и жми +.
      </p>
      <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        Приём пищи
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="btn-interactive min-h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-zinc-100 hover:border-zinc-500"
        >
          {MEAL_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      {products.map((product) => {
        const grams = gramsById[product.id] ?? product.defaultGrams;
        const preview = scaleNutrition(product.per100g, grams);
        return (
          <div
            key={product.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{product.name}</p>
              <p className="text-xs text-zinc-500">
                {product.per100g.kcalPer100g} ккал/100 г · Б{" "}
                {product.per100g.proteinPer100g} → {preview.kcal} ккал · Б{" "}
                {preview.proteinG} за {grams} г
                {product.barcode ? (
                  <span className="text-zinc-600"> · код {product.barcode}</span>
                ) : null}
              </p>
            </div>
            <input
              type="number"
              min={1}
              value={grams}
              onChange={(e) =>
                setGramsById((prev) => ({
                  ...prev,
                  [product.id]: Number(e.target.value),
                }))
              }
              className="btn-interactive w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm hover:border-zinc-500"
            />
            <span className="text-xs text-zinc-500">г</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleAdd(product.id)}
              className="btn-interactive min-h-9 rounded-lg bg-emerald-500/15 px-3 text-sm text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-60"
            >
              {addedId === product.id ? "✓" : "+"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
