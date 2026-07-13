"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { eatFromPantry, type EatFromPantryState } from "@/lib/actions";
import type { PantryItem } from "@/lib/pantry";
import { scaleNutrition } from "@/lib/nutrition";

const MEAL_TYPES = [
  { value: "breakfast", label: "Завтрак" },
  { value: "main", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
] as const;

export function EatFromPantry({ items }: { items: PantryItem[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    eatFromPantry,
    {} as EatFromPantryState,
  );
  const [mealType, setMealType] = useState("main");
  const [gramsById, setGramsById] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.id,
        Math.min(100, Math.max(1, Math.round(item.gramsLeft))),
      ]),
    ),
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Холодильник пуст. Добавь покупки во вкладке «Запас».
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Выбери приём пищи и сколько съел — спишется из запаса и попадёт в
        дневник.
      </p>

      {state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {state.success}
        </p>
      ) : null}

      <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        Приём пищи
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="btn-interactive min-h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-zinc-100"
        >
          {MEAL_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      {state.needsNutrition && state.pantryItemId ? (
        <form
          action={action}
          className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
        >
          <p className="text-sm text-amber-100">
            Для «{state.productName}» нет БЖУ. Введи с этикетки на 100 г один
            раз.
          </p>
          <input type="hidden" name="pantryItemId" value={state.pantryItemId} />
          <input type="hidden" name="grams" value={state.grams ?? 100} />
          <input type="hidden" name="mealType" value={state.mealType ?? mealType} />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="kcalPer100g"
              type="number"
              min={0}
              step="1"
              required
              placeholder="Ккал/100г"
              className="btn-interactive min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
            />
            <input
              name="proteinPer100g"
              type="number"
              min={0}
              step="0.1"
              required
              placeholder="Белок/100г"
              className="btn-interactive min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
            />
            <input
              name="fatPer100g"
              type="number"
              min={0}
              step="0.1"
              placeholder="Жир/100г"
              className="btn-interactive min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
            />
            <input
              name="carbsPer100g"
              type="number"
              min={0}
              step="0.1"
              placeholder="Углеводы/100г"
              className="btn-interactive min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn-interactive min-h-10 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-zinc-950"
          >
            Сохранить и добавить
          </button>
        </form>
      ) : null}

      {items.map((item) => {
        const grams = gramsById[item.id] ?? Math.min(100, item.gramsLeft);
        const preview = item.userProduct
          ? scaleNutrition(item.userProduct.per100g, grams)
          : null;

        return (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-zinc-500">
                В запасе {item.gramsLeft} г
                {preview
                  ? ` → ${preview.kcal} ккал · Б ${preview.proteinG}`
                  : " · БЖУ при первом добавлении"}
              </p>
            </div>
            <input
              type="number"
              min={1}
              max={item.gramsLeft}
              value={grams}
              onChange={(e) =>
                setGramsById((prev) => ({
                  ...prev,
                  [item.id]: Number(e.target.value),
                }))
              }
              className="btn-interactive w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            />
            <span className="text-xs text-zinc-500">г</span>
            <form action={action}>
              <input type="hidden" name="pantryItemId" value={item.id} />
              <input type="hidden" name="grams" value={grams} />
              <input type="hidden" name="mealType" value={mealType} />
              <button
                type="submit"
                disabled={pending || grams > item.gramsLeft}
                className="btn-interactive min-h-9 rounded-lg bg-emerald-500/15 px-3 text-sm text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-60"
              >
                +
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
