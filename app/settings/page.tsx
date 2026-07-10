import { AppNav } from "@/components/app-nav";
import { signOut } from "@/lib/actions";
import { getCurrentProfile } from "@/lib/data";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-5 px-4 py-6">
        <header>
          <p className="text-sm text-emerald-400">Настройки</p>
          <h1 className="text-3xl font-semibold">Профиль</h1>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm">
          <dl className="space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Цель</dt>
              <dd>
                {profile.start_weight_kg} → {profile.target_weight_kg} кг
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Калории</dt>
              <dd>{profile.target_kcal} ккал/день</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Белок</dt>
              <dd>{profile.target_protein_g} г/день</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Вода</dt>
              <dd>{profile.target_water_ml} мл/день</dd>
            </div>
          </dl>
        </section>

        <form action={signOut}>
          <button className="w-full rounded-xl border border-zinc-700 px-4 py-3">
            Выйти
          </button>
        </form>
      </main>
      <AppNav active="/settings" />
    </div>
  );
}
