"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addManualPurchase,
  adjustPantryItem,
  confirmReceiptImport,
  deletePantryItem,
  parseReceiptImageAction,
  parseReceiptTextAction,
  type ReceiptParseState,
} from "@/lib/actions";
import type { PantryItem } from "@/lib/pantry";
import type { UserProduct } from "@/lib/user-products";

type DraftItem = { name: string; grams: number; priceByn: number };

export function PantryClient({
  items,
  myProducts,
  weekByn,
  monthByn,
}: {
  items: PantryItem[];
  myProducts: UserProduct[];
  weekByn: number;
  monthByn: number;
}) {
  const router = useRouter();
  const [manualState, manualAction, manualPending] = useActionState(
    addManualPurchase,
    {},
  );
  const [adjustState, adjustAction, adjustPending] = useActionState(
    adjustPantryItem,
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePantryItem,
    {},
  );
  const [parseState, parseTextAction, parseTextPending] = useActionState(
    parseReceiptTextAction,
    {} as ReceiptParseState,
  );
  const [parseImageState, parseImageAction, parseImagePending] = useActionState(
    parseReceiptImageAction,
    {} as ReceiptParseState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmReceiptImport,
    {},
  );

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [storeName, setStoreName] = useState("");
  const [receiptSource, setReceiptSource] = useState<
    "receipt_text" | "receipt_photo"
  >("receipt_text");
  const [manualName, setManualName] = useState("");
  const [manualGrams, setManualGrams] = useState(300);
  const [manualPrice, setManualPrice] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    const parsed = parseState.items ?? parseImageState.items;
    if (parsed?.length) {
      setDraftItems(parsed);
      setStoreName(
        (parseState.store ?? parseImageState.store ?? "").toString(),
      );
      setReceiptSource(parseImageState.items ? "receipt_photo" : "receipt_text");
    }
  }, [parseState, parseImageState]);

  useEffect(() => {
    if (
      manualState.success ||
      confirmState.success ||
      adjustState.success ||
      deleteState.success
    ) {
      setDraftItems([]);
      router.refresh();
    }
  }, [
    manualState.success,
    confirmState.success,
    adjustState.success,
    deleteState.success,
    router,
  ]);

  function fillFromMyProduct(productId: string) {
    setSelectedProductId(productId);
    const product = myProducts.find((p) => p.id === productId);
    if (!product) return;
    setManualName(product.name);
    setManualGrams(product.defaultGrams);
  }

  async function onPhotoChange(file: File | null) {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    const base64 = btoa(binary);
    const fd = new FormData();
    fd.set("mimeType", file.type || "image/jpeg");
    fd.set("base64", base64);
    parseImageAction(fd);
  }

  const feedback =
    manualState.error ??
    manualState.success ??
    confirmState.error ??
    confirmState.success ??
    adjustState.error ??
    adjustState.success ??
    deleteState.error ??
    deleteState.success ??
    parseState.error ??
    parseState.success ??
    parseImageState.error ??
    parseImageState.success;

  const pending =
    manualPending ||
    adjustPending ||
    deletePending ||
    parseTextPending ||
    parseImagePending ||
    confirmPending;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-sm text-zinc-400">Потрачено за 7 дней</p>
          <p className="mt-1 text-2xl font-semibold">{weekByn.toFixed(2)} BYN</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-sm text-zinc-400">Потрачено за 30 дней</p>
          <p className="mt-1 text-2xl font-semibold">{monthByn.toFixed(2)} BYN</p>
        </div>
      </section>

      {feedback ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            (manualState.error ??
            confirmState.error ??
            adjustState.error ??
            deleteState.error ??
            parseState.error ??
            parseImageState.error)
              ? "border border-red-500/30 bg-red-500/10 text-red-200"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {feedback}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <h2 className="text-lg font-medium">В холодильнике</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Пока пусто. Добавь покупку ниже или импортируй чек.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-zinc-500">
                    {item.userProduct
                      ? `${item.userProduct.per100g.kcalPer100g} ккал/100 г`
                      : "БЖУ ещё не заданы — укажи при первом «съел»"}
                  </p>
                </div>
                <form action={adjustAction} className="flex items-center gap-2">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input
                    name="gramsLeft"
                    type="number"
                    min={0}
                    defaultValue={item.gramsLeft}
                    className="btn-interactive w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
                  />
                  <span className="text-xs text-zinc-500">г</span>
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-interactive min-h-9 rounded-lg border border-zinc-700 px-3 text-sm hover:bg-zinc-800"
                  >
                    ✎
                  </button>
                </form>
                <form action={deleteAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-interactive flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:border-red-500/50 hover:text-red-300"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <h2 className="text-lg font-medium">Добавить покупку</h2>
        {myProducts.length > 0 ? (
          <label className="block space-y-1 text-sm text-zinc-400">
            Из моих продуктов
            <select
              value={selectedProductId}
              onChange={(e) => fillFromMyProduct(e.target.value)}
              className="btn-interactive block w-full min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3"
            >
              <option value="">— выбрать —</option>
              {myProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <form action={manualAction} className="grid gap-3 sm:grid-cols-4">
          <input
            name="name"
            required
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Название"
            className="btn-interactive min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 sm:col-span-2"
          />
          <input
            name="grams"
            type="number"
            min={1}
            required
            value={manualGrams}
            onChange={(e) => setManualGrams(Number(e.target.value))}
            placeholder="Граммы"
            className="btn-interactive min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3"
          />
          <input
            name="priceByn"
            type="number"
            min={0}
            step="0.01"
            required
            value={manualPrice}
            onChange={(e) => setManualPrice(Number(e.target.value))}
            placeholder="BYN"
            className="btn-interactive min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-interactive min-h-11 rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950 hover:bg-emerald-400 sm:col-span-4"
          >
            {manualPending ? "Сохраняем..." : "В холодильник"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
        <h2 className="text-lg font-medium">Импорт чека</h2>
        <p className="text-sm text-zinc-500">
          Вставь текст или фото. Gemini разберёт позиции — проверь и нажми
          «В холодильник». Лимит: 5 разборов в день.
        </p>

        <form action={parseTextAction} className="space-y-3">
          <textarea
            name="receiptText"
            rows={5}
            placeholder="Вставь текст чека сюда..."
            className="btn-interactive w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-interactive min-h-11 rounded-xl border border-zinc-700 px-4 hover:bg-zinc-800"
          >
            {parseTextPending ? "Разбираем..." : "Разобрать текст"}
          </button>
        </form>

        <div className="space-y-2">
          <label className="block text-sm text-zinc-400">
            Или фото чека
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={pending}
              onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
              className="btn-interactive mt-1 block w-full text-sm text-zinc-300"
            />
          </label>
          {parseImagePending ? (
            <p className="text-xs text-zinc-500">Разбираем фото...</p>
          ) : null}
        </div>

        {draftItems.length > 0 ? (
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <label className="block space-y-1 text-sm text-zinc-400">
              Магазин
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="btn-interactive block w-full min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3"
              />
            </label>
            <ul className="space-y-2">
              {draftItems.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:grid-cols-3"
                >
                  <input
                    value={item.name}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                    className="btn-interactive min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm sm:col-span-3"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.grams}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, grams: Number(e.target.value) }
                            : row,
                        ),
                      )
                    }
                    className="btn-interactive min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.priceByn}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, priceByn: Number(e.target.value) }
                            : row,
                        ),
                      )
                    }
                    className="btn-interactive min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraftItems((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="btn-interactive min-h-10 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-red-300"
                  >
                    Убрать
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-400">
              Итого:{" "}
              {draftItems
                .reduce((sum, item) => sum + (item.priceByn || 0), 0)
                .toFixed(2)}{" "}
              BYN
            </p>
            <form action={confirmAction}>
              <input type="hidden" name="source" value={receiptSource} />
              <input type="hidden" name="storeName" value={storeName} />
              <input
                type="hidden"
                name="itemsJson"
                value={JSON.stringify(draftItems)}
              />
              <button
                type="submit"
                disabled={pending || draftItems.length === 0}
                className="btn-interactive min-h-11 rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950 hover:bg-emerald-400"
              >
                {confirmPending ? "Сохраняем..." : "В холодильник"}
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}
