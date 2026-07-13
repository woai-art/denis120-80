import { AppNav } from "@/components/app-nav";
import { CommonFoodsQuickAdd } from "@/components/common-foods-quick-add";
import { FoodSearch } from "@/components/food-search";
import { ManualFoodForm } from "@/components/manual-food-form";
import { MyProductsQuickAdd } from "@/components/my-products-quick-add";
import { addFoodTemplate } from "@/lib/actions";
import { getCurrentProfile, getFoodTemplates } from "@/lib/data";
import { getMyProducts } from "@/lib/user-products";

export default async function FoodPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [templates, myProducts] = await Promise.all([
    getFoodTemplates(profile.id),
    getMyProducts(profile.id),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-6 px-4 py-6">
        <header>
          <p className="text-sm text-emerald-400">Питание</p>
          <h1 className="text-3xl font-semibold">Запись еды</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Всё, что добавишь здесь, попадает в дневник на вкладке «День» и
            суммируется в калории и белок. Сначала нажми «Проснулся» на главной,
            если день ещё не начат.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-4 text-lg font-medium">Мои продукты</h2>
          <MyProductsQuickAdd products={myProducts} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Быстрые шаблоны</h2>
          <p className="text-sm text-zinc-500">
            Одно нажатие сразу добавляет продукт в дневник. «Творог с мёдом» —
            готовый шаблон из онбординга, не случайная запись.
          </p>
          <div className="grid gap-3">
            {templates.map((template) => (
              <form key={template.id} action={addFoodTemplate}>
                <input type="hidden" name="templateId" value={template.id} />
                <button className="btn-interactive flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 text-left hover:border-emerald-500/40 hover:bg-zinc-800/80 active:scale-[0.99]">
                  <span>+ {template.name}</span>
                  <span className="text-sm text-zinc-400">
                    {template.kcal} ккал · {template.protein_g} г белка
                  </span>
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-4 text-lg font-medium">Быстрое добавление</h2>
          <CommonFoodsQuickAdd />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-4 text-lg font-medium">С упаковки (ручной ввод)</h2>
          <ManualFoodForm />
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
