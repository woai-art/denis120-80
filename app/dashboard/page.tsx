import { AppNav } from "@/components/app-nav";
import { FoodLogList } from "@/components/food-log-list";
import { ProgressBar } from "@/components/progress-bar";
import { StartDayForm } from "@/components/start-day-form";
import {
  addWater250,
  addWater500,
  logWeight,
  requestDailyInsight,
  requestMenuSuggestion,
} from "@/lib/actions";
import { getDashboardSummary, getMenuSuggestion, getTodayFoodLog } from "@/lib/data";
import type { MenuSuggestion } from "@/lib/gemini";
import { formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  if (!summary) {
    return null;
  }

  const { profile, userDay, totals, weightAvg7d, latestWeight, insight } =
    summary;

  const menu = userDay
    ? ((await getMenuSuggestion(profile.id, userDay.id)) as MenuSuggestion | null)
    : null;

  const foodLog = await getTodayFoodLog(profile.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-5 px-4 py-6">
        <header className="space-y-1">
          <p className="text-sm text-emerald-400">Мой день</p>
          <h1 className="text-3xl font-semibold">Привет, {profile.display_name}</h1>
          <p className="text-sm text-zinc-400">
            {userDay
              ? `Тип дня: ${userDay.day_template_type}`
              : "День ещё не начат"}
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:col-span-2">
            <p className="text-sm text-zinc-400">Вес (среднее 7 дней)</p>
            <p className="mt-1 text-3xl font-semibold">
              {weightAvg7d ? formatNumber(weightAvg7d, 1) : "—"} кг
            </p>
            {latestWeight ? (
              <p className="text-sm text-zinc-500">
                Сегодня: {formatNumber(latestWeight, 1)} кг
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <ProgressBar
              label="Калории"
              value={totals.kcal}
              target={profile.target_kcal ?? 0}
              unit="ккал"
              accent="amber"
            />
          </div>

          <div className="sm:col-span-2">
            <ProgressBar
              label="Белок"
              value={totals.protein_g}
              target={profile.target_protein_g ?? 0}
              unit="г"
              accent="emerald"
            />
          </div>

          <div className="sm:col-span-2">
            <ProgressBar
              label="Вода"
              value={totals.water_ml}
              target={profile.target_water_ml}
              unit="мл"
              accent="sky"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Дневник питания</h2>
            <a href="/food" className="btn-interactive text-sm text-emerald-400 hover:text-emerald-300">
              + Добавить
            </a>
          </div>
          {!userDay ? (
            <p className="text-sm text-zinc-500">
              Нажми «Проснулся», чтобы начать день. Еда из раздела «Питание»
              попадёт сюда и в счётчики калорий выше.
            </p>
          ) : foodLog.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Пока ничего не записано. Перейди в «Питание» и добавь приёмы
              пищи — они появятся здесь.
            </p>
          ) : (
            <FoodLogList entries={foodLog} showTime />
          )}
        </section>

        <StartDayForm
          hasOpenDay={Boolean(userDay)}
          currentType={userDay?.day_template_type}
        />

        <section className="flex flex-wrap gap-3">
          <form action={addWater250}>
            <button className="btn-interactive min-h-11 rounded-xl bg-sky-500/15 px-4 py-2 text-sky-300 hover:bg-sky-500/25 active:scale-[0.98]">
              +250 мл
            </button>
          </form>
          <form action={addWater500}>
            <button className="btn-interactive min-h-11 rounded-xl bg-sky-500/15 px-4 py-2 text-sky-300 hover:bg-sky-500/25 active:scale-[0.98]">
              +500 мл
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-3 text-lg font-medium">Записать вес</h2>
          <form action={logWeight} className="flex flex-wrap gap-3">
            <input
              name="weightKg"
              type="number"
              step="0.1"
              placeholder="кг"
              required
              className="min-h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4"
            />
            <button className="btn-interactive min-h-11 rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950 hover:bg-emerald-400 active:scale-[0.98]">
              Сохранить
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Совет дня</h2>
            {userDay ? (
              <form action={requestDailyInsight}>
                <button className="btn-interactive min-h-9 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800">
                  {insight ? "Обновить" : "Получить совет"}
                </button>
              </form>
            ) : null}
          </div>
          {insight ? (
            <div className="space-y-2 text-sm text-zinc-300">
              <p>{insight.tip}</p>
              <p className="text-emerald-300">{insight.action}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Нажми «Получить совет» — Gemini посмотрит на твои последние дни.
              Лимит: 3 совета в день.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Меню на день</h2>
            {userDay && !menu ? (
              <form action={requestMenuSuggestion}>
                <button className="btn-interactive min-h-9 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800">
                  Сгенерировать
                </button>
              </form>
            ) : null}
          </div>
          {menu ? (
            <div className="space-y-3 text-sm">
              {menu.meals.map((meal) => (
                <div
                  key={meal.label}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <p className="font-medium">{meal.label}</p>
                    <p className="text-xs text-zinc-500">{meal.time_window}</p>
                  </div>
                  <ul className="space-y-0.5 text-zinc-300">
                    {meal.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-zinc-500">
                    ~{meal.approx_kcal} ккал · белок ~{meal.approx_protein_g} г
                  </p>
                </div>
              ))}
              <p className="text-xs text-zinc-500">
                Итого: ~{menu.total_kcal} ккал, белок ~{menu.total_protein_g} г.{" "}
                {menu.note}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Gemini составит меню под твой график и бюджет калорий. Лимит: 1
              меню в день.
            </p>
          )}
        </section>
      </main>
      <AppNav active="/dashboard" />
    </div>
  );
}
