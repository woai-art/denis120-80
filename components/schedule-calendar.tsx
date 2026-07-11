import Link from "next/link";
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

export function ScheduleCalendar({
  month,
  monthQuery,
  days,
}: {
  month: Date;
  monthQuery: string;
  days: CalendarDayCell[];
}) {
  const todayKey = toDateKey(new Date());
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const grid = calendarGrid(month);
  const dayMap = new Map(days.map((d) => [d.dateKey, d]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/schedule?month=${monthParam(prev)}`}
          className="min-h-10 rounded-xl border border-zinc-700 px-3 py-2 text-sm"
        >
          ←
        </Link>
        <h2 className="text-center text-lg font-medium capitalize">
          {monthTitle(month)}
        </h2>
        <Link
          href={`/schedule?month=${monthParam(next)}`}
          className="min-h-10 rounded-xl border border-zinc-700 px-3 py-2 text-sm"
        >
          →
        </Link>
      </div>

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
          const type = cell?.actualType ?? cell?.planType;
          const meta = type ? DAY_TYPE_META[type] : null;
          const isToday = dateKey === todayKey;

          return (
            <Link
              key={dateKey}
              href={`/schedule/${dateKey}`}
              className={cn(
                "relative flex min-h-[52px] flex-col items-center justify-center rounded-xl border text-sm transition",
                inMonth
                  ? "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                  : "border-transparent bg-zinc-950/30 text-zinc-600",
                meta?.bg,
                isToday && "ring-2 ring-emerald-500/50",
              )}
            >
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
              {cell?.hasFood ? (
                <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              ) : null}
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
            {DAY_TYPE_META[type].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          Есть записи еды
        </span>
      </div>

      <p className="text-sm text-zinc-500">
        Нажми на дату — план смены, дневник питания и вес за этот день.
        Месяц: {monthQuery}.
      </p>
    </div>
  );
}
