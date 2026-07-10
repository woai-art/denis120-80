import { AppNav } from "@/components/app-nav";
import { FoodSearch } from "@/components/food-search";
import { addFoodTemplate, addManualFood } from "@/lib/actions";
import { getCurrentProfile, getFoodTemplates } from "@/lib/data";

export default async function FoodPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const templates = await getFoodTemplates(profile.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-6 px-4 py-6">
        <header>
          <p className="text-sm text-emerald-400">Питание</p>
          <h1 className="text-3xl font-semibold">Быстрый ввод еды</h1>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Шаблоны</h2>
          <div className="grid gap-3">
            {templates.map((template) => (
              <form key={template.id} action={addFoodTemplate}>
                <input type="hidden" name="templateId" value={template.id} />
                <button className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 text-left">
                  <span>{template.name}</span>
                  <span className="text-sm text-zinc-400">
                    {template.kcal} ккал · {template.protein_g} г белка
                  </span>
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-4 text-lg font-medium">Ручной ввод</h2>
          <form action={addManualFood} className="grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Название"
              required
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 sm:col-span-2"
            />
            <input
              name="grams"
              type="number"
              placeholder="Граммы"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
            <input
              name="kcal"
              type="number"
              placeholder="Ккал"
              required
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
            <input
              name="protein_g"
              type="number"
              placeholder="Белок, г"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
            <input
              name="fat_g"
              type="number"
              placeholder="Жиры, г"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
            <input
              name="carbs_g"
              type="number"
              placeholder="Углеводы, г"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
            <button className="min-h-11 rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950 sm:col-span-2">
              Добавить
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-4 text-lg font-medium">Поиск и штрих-код</h2>
          <FoodSearch />
        </section>
      </main>
      <AppNav active="/food" />
    </div>
  );
}
