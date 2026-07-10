import { completeOnboarding } from "@/lib/actions";
import { calculateTargets, estimateMonthsToGoal } from "@/lib/calculations";

const preview = calculateTargets({
  weightKg: 120,
  heightCm: 172,
  age: 45,
  activityLevel: "sedentary",
});

const months = estimateMonthsToGoal({
  startWeightKg: 120,
  targetWeightKg: 80,
});

export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">
          Онбординг
        </p>
        <h1 className="text-3xl font-semibold">Настроим план под тебя</h1>
        <p className="text-zinc-400">
          Сейчас: 120 кг → цель 80 кг за ~{months} мес. Старт: {preview.targetKcal}{" "}
          ккал, белок {preview.targetProteinG} г.
        </p>
      </div>

      <form action={completeOnboarding} className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <label className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <input name="medicalAck" type="checkbox" value="on" required className="mt-1" />
          <span>
            Подтверждаю, что у меня нет противопоказаний к снижению веса без
            наблюдения врача, или есть разрешение врача. Приложение не заменяет
            медицинскую консультацию.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-zinc-400">Имя</span>
            <input
              name="displayName"
              defaultValue="Денис"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-zinc-400">Рост, см</span>
            <input
              name="heightCm"
              type="number"
              defaultValue={172}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-zinc-400">Год рождения</span>
            <input
              name="birthYear"
              type="number"
              defaultValue={1981}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-zinc-400">Текущий вес, кг</span>
            <input
              name="startWeightKg"
              type="number"
              step="0.1"
              defaultValue={120}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-zinc-400">Целевой вес, кг</span>
            <input
              name="targetWeightKg"
              type="number"
              step="0.1"
              defaultValue={80}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-zinc-400">Активность</span>
            <select
              name="activityLevel"
              defaultValue="sedentary"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            >
              <option value="sedentary">Сидячая работа, мало движения</option>
              <option value="light">Лёгкая активность</option>
              <option value="moderate">Умеренная активность</option>
              <option value="active">Высокая активность</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-medium text-zinc-950"
        >
          Сохранить и начать
        </button>
      </form>
    </main>
  );
}
