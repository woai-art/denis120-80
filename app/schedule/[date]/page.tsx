import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { FoodLogList } from "@/components/food-log-list";
import { SchedulePlanForm } from "@/components/schedule-plan-form";
import {
  DAY_TYPE_META,
  formatDayTitle,
  nextDayKey,
  prevDayKey,
} from "@/lib/calendar";
import { getCurrentProfile, getDayDetail } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

export default async function ScheduleDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date: dateKey } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) notFound();

  const profile = await getCurrentProfile();
  if (!profile) return null;

  const detail = await getDayDetail(profile.id, dateKey, profile.timezone);
  const actualType = detail.userDay?.day_template_type ?? null;
  const planMeta = detail.planType ? DAY_TYPE_META[detail.planType] : null;
  const actualMeta = actualType ? DAY_TYPE_META[actualType] : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-5 px-4 py-6">
        <header className="space-y-2">
          <Link href="/schedule" className="text-sm text-emerald-400">
            ← Календарь
          </Link>
          <h1 className="text-2xl font-semibold capitalize">
            {formatDayTitle(dateKey)}
          </h1>
          {planMeta || actualMeta ? (
            <div className="space-y-1 text-sm">
              {planMeta ? (
                <p className={planMeta.color}>План: {planMeta.label}</p>
              ) : (
                <p className="text-zinc-500">План не задан</p>
              )}
              {actualType && actualType !== detail.planType ? (
                <p className="text-violet-300">
                  Факт (от «Проснулся»): {actualMeta!.label}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Тип дня не задан</p>
          )}
          {detail.userDay ? (
            <p className="text-xs text-zinc-500">
              Пробуждение:{" "}
              {new Date(detail.userDay.woke_at).toLocaleString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <SchedulePlanForm
            dateKey={dateKey}
            currentPlan={detail.planType}
            actualType={actualType}
          />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Питание</h2>
            <Link href="/food" className="btn-interactive text-sm text-emerald-400 hover:text-emerald-300">
              + Добавить
            </Link>
          </div>
          {!detail.userDay ? (
            <p className="text-sm text-zinc-500">
              Нет открытого дня с пробуждением в эту дату. Нажми «Проснулся» на
              вкладке «День» в день пробуждения — тогда еда привяжется сюда.
            </p>
          ) : detail.foodLog.length === 0 ? (
            <p className="text-sm text-zinc-500">За этот день еда не записана.</p>
          ) : (
            <>
              <div className="mb-4">
                <FoodLogList entries={detail.foodLog} />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-zinc-950/60 px-3 py-2">
                  <dt className="text-zinc-500">Ккал</dt>
                  <dd className="text-lg font-medium">{detail.totals.kcal}</dd>
                </div>
                <div className="rounded-lg bg-zinc-950/60 px-3 py-2">
                  <dt className="text-zinc-500">Белок</dt>
                  <dd className="text-lg font-medium">
                    {formatNumber(detail.totals.proteinG, 0)} г
                  </dd>
                </div>
                <div className="rounded-lg bg-zinc-950/60 px-3 py-2">
                  <dt className="text-zinc-500">Жиры</dt>
                  <dd>{formatNumber(detail.totals.fatG, 0)} г</dd>
                </div>
                <div className="rounded-lg bg-zinc-950/60 px-3 py-2">
                  <dt className="text-zinc-500">Углеводы</dt>
                  <dd>{formatNumber(detail.totals.carbsG, 0)} г</dd>
                </div>
                <div className="col-span-2 rounded-lg bg-zinc-950/60 px-3 py-2">
                  <dt className="text-zinc-500">Вода</dt>
                  <dd>{detail.totals.waterMl} мл</dd>
                </div>
              </dl>
            </>
          )}
        </section>

        {detail.weights.length > 0 ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-3 text-lg font-medium">Вес</h2>
            <ul className="space-y-1 text-sm">
              {detail.weights.map((w) => (
                <li key={w.measuredAt} className="flex justify-between">
                  <span className="text-zinc-400">
                    {new Date(w.measuredAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>{formatNumber(w.weightKg, 1)} кг</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav className="flex justify-between gap-3 text-sm">
          <Link
            href={`/schedule/${prevDayKey(dateKey)}`}
            className="btn-interactive rounded-xl border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
          >
            ← Вчера
          </Link>
          <Link
            href={`/schedule/${nextDayKey(dateKey)}`}
            className="btn-interactive rounded-xl border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
          >
            Завтра →
          </Link>
        </nav>
      </main>
      <AppNav active="/schedule" />
    </div>
  );
}
