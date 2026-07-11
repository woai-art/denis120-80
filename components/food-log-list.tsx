"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteMealItem } from "@/lib/actions";
import type { FoodLogEntry } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const mealTypeLabel: Record<string, string> = {
  breakfast: "Завтрак",
  main: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

export function FoodLogList({
  entries,
  showTime = false,
}: {
  entries: FoodLogEntry[];
  showTime?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteMealItem, {});

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="space-y-2">
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

      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-start justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{entry.name}</p>
              <p className="text-xs text-zinc-500">
                {mealTypeLabel[entry.mealType] ?? entry.mealType}
                {entry.grams ? ` · ${formatNumber(entry.grams, 0)} г` : ""}
                {showTime && entry.eatenAt
                  ? ` · ${new Date(entry.eatenAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-zinc-300">{entry.kcal} ккал</span>
              <form action={action}>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
