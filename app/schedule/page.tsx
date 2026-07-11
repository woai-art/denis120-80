import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ScheduleCalendarInteractive } from "@/components/schedule-calendar-interactive";
import { monthParam, parseMonthParam } from "@/lib/calendar";
import { getCalendarMonth, getCurrentProfile } from "@/lib/data";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const days = await getCalendarMonth(profile.id, month, profile.timezone);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-5 px-4 py-6">
        <header className="space-y-2">
          <p className="text-sm text-emerald-400">График</p>
          <h1 className="text-3xl font-semibold">Календарь смен</h1>
          <p className="text-sm text-zinc-400">
            Отмечай ночные смены, отсыпные и выходные. Включи «Закрасить график»
            и кликай по дням — быстрее, чем по одному. Фиолетовый цвет на
            календаре — это план, а не факт от «Проснулся».
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <ScheduleCalendarInteractive
            month={month}
            monthQuery={monthParam(month)}
            days={days}
          />
        </section>

        <p className="text-center">
          <Link href="/schedule/templates" className="btn-interactive text-sm text-emerald-400 hover:text-emerald-300">
            Шаблоны сна и окон питания →
          </Link>
        </p>
      </main>
      <AppNav active="/schedule" />
    </div>
  );
}
