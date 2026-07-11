import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ru } from "date-fns/locale";
import type { DayTemplateType } from "@/lib/types";

export const DEFAULT_TIMEZONE = "Europe/Moscow";

export const DAY_TYPE_META: Record<
  DayTemplateType,
  { label: string; short: string; color: string; bg: string }
> = {
  night_shift: {
    label: "Ночная смена",
    short: "Ночь",
    color: "text-violet-300",
    bg: "bg-violet-500/25 ring-violet-500/40",
  },
  recovery: {
    label: "Отсыпной",
    short: "Отдых",
    color: "text-sky-300",
    bg: "bg-sky-500/25 ring-sky-500/40",
  },
  day_off: {
    label: "Выходной",
    short: "Вых",
    color: "text-emerald-300",
    bg: "bg-emerald-500/20 ring-emerald-500/35",
  },
};

export function toDateKey(date: Date, tz = DEFAULT_TIMEZONE) {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

export function parseMonthParam(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const parsed = parseISO(`${month}-01`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function monthParam(date: Date) {
  return format(date, "yyyy-MM");
}

export function monthTitle(date: Date) {
  return format(date, "LLLL yyyy", { locale: ru });
}

export function dayRangeUtc(dateKey: string, tz = DEFAULT_TIMEZONE) {
  const start = fromZonedTime(`${dateKey}T00:00:00`, tz);
  const end = fromZonedTime(`${dateKey}T23:59:59.999`, tz);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function calendarGrid(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => ({
    date: day,
    dateKey: toDateKey(day),
    inMonth: isSameMonth(day, month),
  }));
}

export function shiftMonth(month: Date, delta: number) {
  const d = new Date(month);
  d.setMonth(d.getMonth() + delta);
  return d;
}

export function formatDayTitle(dateKey: string) {
  const d = parseISO(dateKey);
  return format(d, "d MMMM yyyy, EEEE", { locale: ru });
}

export function prevDayKey(dateKey: string) {
  return toDateKey(addDays(parseISO(dateKey), -1));
}

export function nextDayKey(dateKey: string) {
  return toDateKey(addDays(parseISO(dateKey), 1));
}

export type CalendarDayCell = {
  dateKey: string;
  inMonth: boolean;
  planType: DayTemplateType | null;
  actualType: DayTemplateType | null;
  kcal: number | null;
  proteinG: number | null;
  hasFood: boolean;
};

