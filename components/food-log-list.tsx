"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMealItem, updateMealItem } from "@/lib/actions";
import type { FoodLogEntry } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const MEAL_TYPES = [
  { value: "breakfast", label: "Завтрак" },
  { value: "main", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
] as const;

const mealTypeLabel: Record<string, string> = Object.fromEntries(
  MEAL_TYPES.map((t) => [t.value, t.label]),
);

export function FoodLogList({
  entries,
  showTime = false,
}: {
  entries: FoodLogEntry[];
  showTime?: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteMealItem,
    {},
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateMealItem,
    {},
  );

  useEffect(() => {
    if (deleteState.success || updateState.success) {
      setEditingId(null);
      router.refresh();
    }
  }, [deleteState.success, updateState.success, router]);

  const feedbackError = deleteState.error ?? updateState.error;
  const feedbackSuccess = deleteState.success ?? updateState.success;
  const pending = deletePending || updatePending;

  return (
    <div className="space-y-2">
      {feedbackError ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {feedbackError}
        </p>
      ) : null}
      {feedbackSuccess ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {feedbackSuccess}
        </p>
      ) : null}

      <ul className="space-y-2">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id;

          return (
            <li
              key={entry.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
            >
              {isEditing ? (
                <form action={updateAction} className="space-y-3">
                  <input type="hidden" name="itemId" value={entry.id} />
                  <p className="font-medium">{entry.name}</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="space-y-1 text-xs text-zinc-400">
                      Приём пищи
                      <select
                        name="mealType"
                        defaultValue={entry.mealType}
                        className="btn-interactive block min-h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 hover:border-zinc-500"
                      >
                        {MEAL_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-zinc-400">
                      Граммы
                      <input
                        name="grams"
                        type="number"
                        min={1}
                        defaultValue={entry.grams ?? undefined}
                        className="btn-interactive block w-24 min-h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm hover:border-zinc-500"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={pending}
                      className="btn-interactive min-h-9 rounded-lg bg-emerald-500 px-3 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {updatePending ? "..." : "Сохранить"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setEditingId(null)}
                      className="btn-interactive min-h-9 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-xs text-zinc-500">
                      {mealTypeLabel[entry.mealType] ?? entry.mealType}
                      {entry.grams
                        ? ` · ${formatNumber(entry.grams, 0)} г`
                        : ""}
                      {showTime && entry.eatenAt
                        ? ` · ${new Date(entry.eatenAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-zinc-300">{entry.kcal} ккал</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setEditingId(entry.id)}
                      title="Изменить"
                      aria-label={`Изменить ${entry.name}`}
                      className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50"
                    >
                      ✎
                    </button>
                    <form action={deleteAction}>
                      <input type="hidden" name="itemId" value={entry.id} />
                      <button
                        type="submit"
                        disabled={pending}
                        title="Удалить запись"
                        aria-label={`Удалить ${entry.name}`}
                        className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-base leading-none text-zinc-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
