import { AppNav } from "@/components/app-nav";
import { PantryClient } from "@/components/pantry-client";
import { getCurrentProfile } from "@/lib/data";
import { getExpenseSummary, getPantryItems } from "@/lib/pantry";
import { getMyProducts } from "@/lib/user-products";

export default async function PantryPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [items, myProducts, expenses] = await Promise.all([
    getPantryItems(profile.id),
    getMyProducts(profile.id),
    getExpenseSummary(profile.id),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-5 px-4 py-6">
        <header className="space-y-2">
          <p className="text-sm text-emerald-400">Холодильник</p>
          <h1 className="text-3xl font-semibold">Запас дома</h1>
          <p className="text-sm text-zinc-400">
            Покупки и остатки в граммах. Цены в BYN. Еду списывай через
            «Питание → Из холодильника».
          </p>
        </header>

        <PantryClient
          items={items}
          myProducts={myProducts}
          weekByn={expenses.weekByn}
          monthByn={expenses.monthByn}
        />
      </main>
      <AppNav active="/pantry" />
    </div>
  );
}
