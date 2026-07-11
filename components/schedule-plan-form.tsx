"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearSchedulePlan,
  setSchedulePlan,
  type SchedulePlanState,
} from "@/lib/actions";
import { DAY_TYPE_META } from "@/lib/calendar";
import type { DayTemplateType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: DayTemplateType[] = ["night_shift", "recovery", "day_off"];
const initialState: SchedulePlanState = {};

export function SchedulePlanForm({
  dateKey,
  currentPlan,
  actualType,
}: {
  dateKey: string;
  currentPlan: DayTemplateType | null;
  actualType?: DayTemplateType | null;
}) {
  const router = useRouter();
  const [state, planAction, pending] = useActionState(
    setSchedulePlan,
    initialState,
  );
  const [, clearAction, clearPending] = useActionState(
    clearSchedulePlan,
    initialState,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  function submitPlan(type: DayTemplateType) {
    const fd = new FormData();
    fd.set("dateKey", dateKey);
    fd.set("dayTemplateType", type);
    startTransition(() => planAction(fd));
  }

  function submitClear() {
    const fd = new FormData();
    fd.set("dateKey", dateKey);
    startTransition(() => clearAction(fd));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        План на календарь.{" "}
        {actualType ? (
          <span className="text-violet-300">
            Фиолетовая метка «факт» — от «Проснулся» (
            {DAY_TYPE_META[actualType].label}), это не план.
          </span>
        ) : null}
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

      <div className="flex flex-wrap gap-2">
        {TYPES.map((type) => (
          <button
            key={type}
            type="button"
            disabled={pending || clearPending}
            onClick={() => submitPlan(type)}
            className={cn(
              "btn-interactive min-h-10 rounded-xl px-3 text-sm ring-1 transition disabled:opacity-60",
              DAY_TYPE_META[type].bg,
              DAY_TYPE_META[type].color,
              "hover:brightness-110 active:scale-[0.98]",
              currentPlan === type && "ring-2 ring-white/40",
            )}
          >
            {DAY_TYPE_META[type].label}
          </button>
        ))}
        {currentPlan ? (
          <button
            type="button"
            disabled={pending || clearPending}
            onClick={submitClear}
            className="btn-interactive min-h-10 rounded-xl border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/80 disabled:opacity-60"
          >
            {clearPending ? "Сохраняем..." : "Сбросить план"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
