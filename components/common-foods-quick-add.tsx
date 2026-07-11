"use client";

import { useState, useTransition } from "react";
import { addCommonFood } from "@/lib/actions";
import { COMMON_FOODS } from "@/lib/common-foods";
import { scaleNutrition } from "@/lib/nutrition";

export function CommonFoodsQuickAdd() {
  const [gramsById, setGramsById] = useState<Record<string, number>>(() =>
    Object.fromEntries(COMMON_FOODS.map((f) => [f.id, f.defaultGrams])),
  );
  const [isPending, startTransition] = useTransition();

  function handleAdd(foodId: string) {
    const food = COMMON_FOODS.find((f) => f.id === foodId);
    if (!food) return;
    const grams = gramsById[foodId] ?? food.defaultGrams;
    const formData = new FormData();
    formData.set("foodId", foodId);
    formData.set("grams", String(grams));
    startTransition(() => addCommonFood(formData));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Протеин, овощи и простые продукты — вес подправь вручную. Средние
        значения овощей; протеин — с твоей этикетки BioTechUSA.
      </p>
      {COMMON_FOODS.map((food) => {
        const grams = gramsById[food.id] ?? food.defaultGrams;
        const preview = scaleNutrition(food.per100g, grams);
        return (
          <div
            key={food.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{food.name}</p>
              <p className="text-xs text-zinc-500">
                {food.hint ?? `${food.per100g.kcalPer100g} ккал/100 г`} →{" "}
                {preview.kcal} ккал за {grams} г
              </p>
            </div>
            <input
              type="number"
              min={1}
              value={grams}
              onChange={(e) =>
                setGramsById((prev) => ({
                  ...prev,
                  [food.id]: Number(e.target.value),
                }))
              }
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            />
            <span className="text-xs text-zinc-500">г</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleAdd(food.id)}
              className="btn-interactive min-h-9 rounded-lg bg-emerald-500/15 px-3 text-sm text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-60"
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
}
