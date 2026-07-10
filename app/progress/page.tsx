import { AppNav } from "@/components/app-nav";
import { ProgressChart } from "@/components/progress-chart";
import { getCurrentProfile, getProgressData } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const milestones = [115, 110, 105, 100, 95, 90, 85, 80];

export default async function ProgressPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const progress = await getProgressData(profile.id, 60);
  const latestWeight = progress.weights.at(-1)?.weight ?? profile.start_weight_kg;
  const lost = profile.start_weight_kg - latestWeight;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-6 px-4 py-6">
        <header>
          <p className="text-sm text-emerald-400">Прогресс</p>
          <h1 className="text-3xl font-semibold">Динамика веса</h1>
          <p className="text-sm text-zinc-400">
            Старт {formatNumber(profile.start_weight_kg, 1)} кг → сейчас{" "}
            {formatNumber(latestWeight, 1)} кг ({lost > 0 ? "−" : ""}
            {formatNumber(Math.abs(lost), 1)} кг)
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-4 text-lg font-medium">График веса</h2>
          <ProgressChart weights={progress.weights} />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-3 text-lg font-medium">Вехи</h2>
          <div className="flex flex-wrap gap-2">
            {milestones.map((weight) => {
              const reached = latestWeight <= weight;
              return (
                <span
                  key={weight}
                  className={`rounded-full px-3 py-1 text-sm ${
                    reached
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {weight} кг
                </span>
              );
            })}
          </div>
        </section>
      </main>
      <AppNav active="/progress" />
    </div>
  );
}
