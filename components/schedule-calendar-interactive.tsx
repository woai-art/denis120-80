"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cycleSchedulePlan, type SchedulePlanState } from "@/lib/actions";
import {
  calendarGrid,
  DAY_TYPE_META,
  monthParam,
  monthTitle,
  shiftMonth,
  toDateKey,
  type CalendarDayCell,
} from "@/lib/calendar";
import type { DayTemplateType } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const initialState: SchedulePlanState = {};

export function ScheduleCalendarInteractive({
  month,
  days,
}: {
  month: Date;
  monthQuery?: string;
  days: CalendarDayCell[];
}) {
  const router = useRouter();
  const [paintMode, setPaintMode] = useState(false);
  const [cycleState, cycleAction, cyclePending] = useActionState(
    cycleSchedulePlan,
    initialState,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (cycleState.success) {
      router.refresh();
    }
  }, [cycleState.success, router]);

  const todayKey = toDateKey(new Date());
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const grid = calendarGrid(month);
  const dayMap = new Map(days.map((d) => [d.dateKey, d]));

  const feedback = cycleState.error ?? cycleState.success;
  const pending = cyclePending;

  function paintDay(dateKey: string) {
    const fd = new FormData();
    fd.set("dateKey", dateKey);
    startTransition(() => {
      cycleAction(fd);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/schedule?month=${monthParam(prev)}`}
          className="btn-interactive min-h-10 rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:border-zinc-500 hover:bg-zinc-800"
        >
          ←
        </Link>
        <h2 className="text-center text-lg font-medium capitalize">
          {monthTitle(month)}
        </h2>
        <Link
          href={`/schedule?month=${monthParam(next)}`}
          className="btn-interactive min-h-10 rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:border-zinc-500 hover:bg-zinc-800"
        >
          →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPaintMode((v) => !v)}
          className={cn(
            "btn-interactive min-h-10 rounded-xl px-4 text-sm font-medium transition",
            paintMode
              ? "bg-violet-500 text-white hover:bg-violet-400"
              : "border border-zinc-700 hover:border-violet-500/50 hover:bg-violet-500/10",
          )}
        >
          {paintMode ? "Режим планирования: ВКЛ" : "Закрасить график на месяц"}
        </button>
        {paintMode ? (
          <span className="text-xs text-zinc-400">
            Клик по дню: пусто → ночь → отдых → выходной → пусто
          </span>
        ) : null}
      </div>

      {feedback ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-sm",
            cycleState.error
              ? "border border-red-500/30 bg-red-500/10 text-red-200"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
          )}
        >
          {feedback}
        </p>
      ) : null}
      {pending ? (
        <p className="text-xs text-zinc-500">Сохраняем...</p>
      ) : null}

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map(({ dateKey, inMonth }) => {
          const cell = dayMap.get(dateKey);
          const planType = cell?.planType;
          const actualType = cell?.actualType;
          const meta = planType ? DAY_TYPE_META[planType] : null;
          const isToday = dateKey === todayKey;

          const cellClass = cn(
            "relative flex min-h-[52px] flex-col items-center justify-center rounded-xl border text-sm transition",
            inMonth
              ? "border-zinc-800 bg-zinc-900/50"
              : "border-transparent bg-zinc-950/30 text-zinc-600",
            meta?.bg,
            isToday && "ring-2 ring-emerald-500/50",
            paintMode && inMonth && "cursor-pointer hover:ring-2 hover:ring-violet-400/60",
            !paintMode &&
              inMonth &&
              "btn-interactive hover:border-zinc-500 hover:bg-zinc-800/80",
          );

          const inner = (
            <>
              <span
                className={cn(
                  "font-medium",
                  !inMonth && "opacity-40",
                  isToday && "text-emerald-300",
                )}
              >
                {dateKey.slice(8)}
              </span>
              {meta ? (
                <span className={cn("text-[10px] leading-tight", meta.color)}>
                  {meta.short}
                </span>
              ) : null}
              {actualType && actualType !== planType ? (
                <span
                  className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-400"
                  title={`Факт: ${DAY_TYPE_META[actualType].label}`}
                />
              ) : null}
              {cell?.hasFood ? (
                <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              ) : null}
            </>
          );

          if (paintMode && inMonth) {
            return (
              <button
                key={dateKey}
                type="button"
                disabled={pending}
                onClick={() => paintDay(dateKey)}
                className={cellClass}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link key={dateKey} href={`/schedule/${dateKey}`} className={cellClass}>
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        {(Object.keys(DAY_TYPE_META) as DayTemplateType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-sm ring-1",
                DAY_TYPE_META[type].bg,
              )}
            />
            {DAY_TYPE_META[type].label} (план)
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
          Факт ≠ план
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          Еда записана
        </span>
      </div>

    </div>
  );
}
