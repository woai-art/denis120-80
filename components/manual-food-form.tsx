"use client";

import { useMemo, useState, useTransition } from "react";
import { addManualFood } from "@/lib/actions";
import { scaleNutrition } from "@/lib/nutrition";

const MEAL_TYPES = [
  { value: "breakfast", label: "Завтрак" },
  { value: "main", label: "Обед / основной" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
];

export function ManualFoodForm() {
  const [name, setName] = useState("");
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState("main");
  const [kcalPer100g, setKcalPer100g] = useState(0);
  const [proteinPer100g, setProteinPer100g] = useState(0);
  const [fatPer100g, setFatPer100g] = useState(0);
  const [carbsPer100g, setCarbsPer100g] = useState(0);
  const [packageGrams, setPackageGrams] = useState<number | "">("");
  const [packageKcal, setPackageKcal] = useState<number | "">("");
  const [packageProtein, setPackageProtein] = useState<number | "">("");
  const [packageFat, setPackageFat] = useState<number | "">("");
  const [packageCarbs, setPackageCarbs] = useState<number | "">("");
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const preview = useMemo(
    () =>
      scaleNutrition(
        {
          kcalPer100g,
          proteinPer100g,
          fatPer100g,
          carbsPer100g,
        },
        grams,
      ),
    [grams, kcalPer100g, proteinPer100g, fatPer100g, carbsPer100g],
  );

  function fillFromPackage() {
    if (!packageGrams || packageGrams <= 0) return;
    const factor = 100 / packageGrams;
    if (packageKcal) setKcalPer100g(Math.round(Number(packageKcal) * factor));
    if (packageProtein)
      setProteinPer100g(Number((Number(packageProtein) * factor).toFixed(1)));
    if (packageFat)
      setFatPer100g(Number((Number(packageFat) * factor).toFixed(1)));
    if (packageCarbs)
      setCarbsPer100g(Number((Number(packageCarbs) * factor).toFixed(1)));
    setGrams(packageGrams);
  }

  function handleSubmit() {
    if (!name.trim() || grams < 1) return;
    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("grams", String(grams));
    formData.set("mealType", mealType);
    formData.set("kcalPer100g", String(kcalPer100g));
    formData.set("proteinPer100g", String(proteinPer100g));
    formData.set("fatPer100g", String(fatPer100g));
    formData.set("carbsPer100g", String(carbsPer100g));

    startTransition(async () => {
      await addManualFood(formData);
      setAdded(true);
      setName("");
      setTimeout(() => setAdded(false), 2500);
    });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-sm text-sky-200">
        Вводи цифры <strong>с упаковки на 100 г</strong> (или на весь пакет —
        см. блок ниже). Сколько съел — в «Граммы порции». Итог посчитается сам.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-zinc-400">Название</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Скумбрия в масле, овсянка..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Приём пищи</span>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
          >
            {MEAL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Граммы порции (сколько съел)</span>
          <input
            type="number"
            min={1}
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Ккал на 100 г</span>
          <input
            type="number"
            min={0}
            value={kcalPer100g || ""}
            onChange={(e) => setKcalPer100g(Number(e.target.value))}
            placeholder="с упаковки"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Белок на 100 г, г</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={proteinPer100g || ""}
            onChange={(e) => setProteinPer100g(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Жиры на 100 г, г</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={fatPer100g || ""}
            onChange={(e) => setFatPer100g(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Углеводы на 100 г, г</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={carbsPer100g || ""}
            onChange={(e) => setCarbsPer100g(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
          />
        </label>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
        <p className="mb-2 font-medium text-zinc-300">
          На упаковке только «на весь продукт»?
        </p>
        <p className="mb-2 text-zinc-500">
          Пример: творог 300 г, 213 ккал на всю шайбу — введи вес упаковки и
          ккал/БЖУ с этикетки, нажми «Пересчитать на 100 г».
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="number"
            min={1}
            value={packageGrams}
            onChange={(e) =>
              setPackageGrams(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="Вес на упаковке, г"
            className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3"
          />
          <input
            type="number"
            min={0}
            value={packageKcal}
            onChange={(e) =>
              setPackageKcal(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="Ккал на всю упаковку"
            className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3"
          />
          <input
            type="number"
            min={0}
            step={0.1}
            value={packageProtein}
            onChange={(e) =>
              setPackageProtein(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="Белок на упаковку, г"
            className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3"
          />
          <input
            type="number"
            min={0}
            step={0.1}
            value={packageFat}
            onChange={(e) =>
              setPackageFat(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="Жиры на упаковку, г"
            className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3"
          />
          <input
            type="number"
            min={0}
            step={0.1}
            value={packageCarbs}
            onChange={(e) =>
              setPackageCarbs(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="Углеводы на упаковку, г"
            className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 sm:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={fillFromPackage}
          className="mt-2 min-h-10 rounded-lg border border-zinc-700 px-3 text-zinc-300"
        >
          Пересчитать на 100 г и подставить порцию
        </button>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
        <p className="text-emerald-300">
          Итого за порцию {grams} г: {preview.kcal} ккал · Б {preview.proteinG}{" "}
          · Ж {preview.fatG} · У {preview.carbsG}
        </p>
      </div>

      {added ? (
        <p className="text-sm text-emerald-300">
          Добавлено в дневник. Смотри раздел «День».
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !name.trim() || grams < 1}
        className="min-h-11 w-full rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950 disabled:opacity-60"
      >
        {isPending ? "Добавляем..." : "Добавить в дневник"}
      </button>
    </div>
  );
}
