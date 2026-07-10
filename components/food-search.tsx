"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addOffFood } from "@/lib/actions";
import { BarcodeScanner } from "@/components/barcode-scanner";

type Product = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
};

export function FoodSearch() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [grams, setGrams] = useState(100);
  const [status, setStatus] = useState<
    "idle" | "searching" | "empty" | "error" | "added"
  >("idle");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setProducts([]);
      setStatus("idle");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setStatus("searching");
      try {
        const response = await fetch(
          `/api/food/search?q=${encodeURIComponent(trimmed)}`,
        );
        const data = (await response.json()) as { products: Product[] };
        setProducts(data.products);
        setStatus(data.products.length === 0 ? "empty" : "idle");
      } catch {
        setStatus("error");
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleBarcode(code: string) {
    setScannerOpen(false);
    setStatus("searching");
    try {
      const response = await fetch(`/api/food/barcode/${code}`);
      if (!response.ok) {
        setStatus("empty");
        return;
      }
      const data = (await response.json()) as { product: Product };
      setSelected(data.product);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function handleAdd() {
    if (!selected) return;
    const formData = new FormData();
    formData.set("name", selected.name);
    formData.set("grams", String(grams));
    formData.set("kcalPer100g", String(selected.kcalPer100g));
    formData.set("proteinPer100g", String(selected.proteinPer100g));
    formData.set("fatPer100g", String(selected.fatPer100g));
    formData.set("carbsPer100g", String(selected.carbsPer100g));
    if (selected.barcode) formData.set("barcode", selected.barcode);
    formData.set("offProductId", selected.id);

    startTransition(async () => {
      await addOffFood(formData);
      setSelected(null);
      setQuery("");
      setProducts([]);
      setGrams(100);
      setStatus("added");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск продукта (мин. 2 буквы)"
          className="min-h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
        />
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm"
        >
          Штрих-код
        </button>
      </div>

      {status === "searching" && (
        <p className="text-sm text-zinc-500">Ищем...</p>
      )}
      {status === "empty" && (
        <p className="text-sm text-zinc-500">
          Ничего не нашлось. Попробуй другое название или ручной ввод ниже.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-300">
          Open Food Facts не отвечает. Попробуй позже или ручной ввод.
        </p>
      )}
      {status === "added" && (
        <p className="text-sm text-emerald-300">Добавлено в текущий день.</p>
      )}

      {products.length > 0 && !selected && (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => setSelected(product)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate">{product.name}</span>
                  {product.brand && (
                    <span className="block text-xs text-zinc-500">
                      {product.brand}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm text-zinc-400">
                  {product.kcalPer100g} ккал/100г
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-zinc-400">
                {selected.kcalPer100g} ккал · Б {selected.proteinPer100g} · Ж{" "}
                {selected.fatPer100g} · У {selected.carbsPer100g} (на 100 г)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-zinc-400"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={grams}
              min={1}
              max={5000}
              onChange={(event) => setGrams(Number(event.target.value))}
              className="min-h-11 w-28 rounded-xl border border-zinc-700 bg-zinc-950 px-4"
            />
            <span className="self-center text-sm text-zinc-400">грамм</span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || grams < 1}
              className="min-h-11 flex-1 rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950 disabled:opacity-60"
            >
              {isPending
                ? "Добавляем..."
                : `Добавить ${Math.round((selected.kcalPer100g * grams) / 100)} ккал`}
            </button>
          </div>
        </div>
      )}

      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
