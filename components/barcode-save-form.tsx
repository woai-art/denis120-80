"use client";

import { useState, useTransition } from "react";
import { saveUserBarcodeProduct } from "@/lib/actions";
import { scaleNutrition } from "@/lib/nutrition";

export function BarcodeSaveForm({
  barcode,
  onSaved,
}: {
  barcode: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [grams, setGrams] = useState(100);
  const [kcalPer100g, setKcalPer100g] = useState(0);
  const [proteinPer100g, setProteinPer100g] = useState(0);
  const [fatPer100g, setFatPer100g] = useState(0);
  const [carbsPer100g, setCarbsPer100g] = useState(0);
  const [isPending, startTransition] = useTransition();

  const preview = scaleNutrition(
    { kcalPer100g, proteinPer100g, fatPer100g, carbsPer100g },
    grams,
  );

  function handleSave() {
    const formData = new FormData();
    formData.set("barcode", barcode);
    formData.set("name", name);
    formData.set("grams", String(grams));
    formData.set("kcalPer100g", String(kcalPer100g));
    formData.set("proteinPer100g", String(proteinPer100g));
    formData.set("fatPer100g", String(fatPer100g));
    formData.set("carbsPer100g", String(carbsPer100g));

    startTransition(async () => {
      await saveUserBarcodeProduct(formData);
      onSaved();
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-sm text-amber-200">
        Штрих-код <span className="font-mono">{barcode}</span> не найден в
        Open Food Facts (белорусские товары часто отсутствуют). Сохрани один раз
        с этикетки — в следующий раз найдётся автоматически.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название с упаковки"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
      />
      <div className="grid grid-cols-2 gap-2 text-sm">
        <input
          type="number"
          min={0}
          value={kcalPer100g || ""}
          onChange={(e) => setKcalPer100g(Number(e.target.value))}
          placeholder="Ккал / 100 г"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
        <input
          type="number"
          min={1}
          value={grams}
          onChange={(e) => setGrams(Number(e.target.value))}
          placeholder="Порция, г"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
        <input
          type="number"
          min={0}
          step={0.1}
          value={proteinPer100g || ""}
          onChange={(e) => setProteinPer100g(Number(e.target.value))}
          placeholder="Белок / 100 г"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
        <input
          type="number"
          min={0}
          step={0.1}
          value={fatPer100g || ""}
          onChange={(e) => setFatPer100g(Number(e.target.value))}
          placeholder="Жиры / 100 г"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
        <input
          type="number"
          min={0}
          step={0.1}
          value={carbsPer100g || ""}
          onChange={(e) => setCarbsPer100g(Number(e.target.value))}
          placeholder="Углеводы / 100 г"
          className="col-span-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Порция: {preview.kcal} ккал · Б {preview.proteinG} · Ж {preview.fatG} ·
        У {preview.carbsG}
      </p>
      <button
        type="button"
        disabled={isPending || !name.trim()}
        onClick={handleSave}
        className="min-h-10 w-full rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950 disabled:opacity-60"
      >
        {isPending ? "Сохраняем..." : "Сохранить и добавить в дневник"}
      </button>
    </div>
  );
}
