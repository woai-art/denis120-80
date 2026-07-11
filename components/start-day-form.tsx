"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startDay, type StartDayState } from "@/lib/actions";
import type { DayTemplateType } from "@/lib/types";
import { ActionButton } from "@/components/action-button";
import { DAY_TYPE_META } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const initialState: StartDayState = {};

const OPTIONS: { value: DayTemplateType; label: string }[] = [
  { value: "night_shift", label: "Ночная смена" },
  { value: "recovery", label: "Отсыпной" },
  { value: "day_off", label: "Выходной" },
];

export function StartDayForm({
  hasOpenDay,
  currentType,
}: {
  hasOpenDay: boolean;
  currentType?: DayTemplateType;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(startDay, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 className="text-lg font-medium">Начало дня</h2>
      <p className="text-sm text-zinc-400">
        {hasOpenDay
          ? `День уже идёт${currentType ? ` (${DAY_TYPE_META[currentType].label})` : ""}. Повторное нажатие закроет старый день и начнёт новый.`
          : "Нажми, когда проснулся — тогда можно записывать еду."}
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

      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Тип дня</span>
          <select
            name="dayTemplateType"
            defaultValue={currentType ?? "night_shift"}
            className="btn-interactive block min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 hover:border-zinc-500"
          >
            {OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <ActionButton
          variant="primary"
          pendingLabel="Начинаем..."
          className={cn(pending && "opacity-80")}
        >
          {hasOpenDay ? "Начать заново" : "Проснулся"}
        </ActionButton>
      </form>
    </div>
  );
}
