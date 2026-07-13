import { createClient } from "@/lib/supabase/server";
import {
  getUserProductByNameKey,
  productNameKey,
  type UserProduct,
} from "@/lib/user-products";

export type PantryItem = {
  id: string;
  name: string;
  gramsLeft: number;
  userProductId: string | null;
  userProduct: UserProduct | null;
  updatedAt: string;
};

export type PurchaseLineInput = {
  name: string;
  grams: number;
  priceByn: number;
};

export type ExpenseSummary = {
  weekByn: number;
  monthByn: number;
};

export async function getPantryItems(profileId: string): Promise<PantryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pantry_items")
    .select(
      `
      id,
      name,
      grams_left,
      user_product_id,
      updated_at,
      user_products (
        id,
        name,
        barcode,
        default_grams,
        kcal_per_100g,
        protein_per_100g,
        fat_per_100g,
        carbs_per_100g,
        last_used_at
      )
    `,
    )
    .eq("profile_id", profileId)
    .gt("grams_left", 0)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => {
    const rawProduct = row.user_products as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null;
    const product = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct;

    return {
      id: row.id as string,
      name: row.name as string,
      gramsLeft: Number(row.grams_left),
      userProductId: (row.user_product_id as string | null) ?? null,
      userProduct: product
        ? {
            id: product.id as string,
            name: product.name as string,
            barcode: (product.barcode as string | null) ?? null,
            defaultGrams: Number(product.default_grams) || 100,
            per100g: {
              kcalPer100g: Number(product.kcal_per_100g),
              proteinPer100g: Number(product.protein_per_100g),
              fatPer100g: Number(product.fat_per_100g),
              carbsPer100g: Number(product.carbs_per_100g),
            },
            lastUsedAt: product.last_used_at as string,
          }
        : null,
      updatedAt: row.updated_at as string,
    };
  });
}

export async function getExpenseSummary(
  profileId: string,
): Promise<ExpenseSummary> {
  const supabase = await createClient();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { data } = await supabase
    .from("purchases")
    .select("total_byn, purchased_at")
    .eq("profile_id", profileId)
    .gte("purchased_at", monthAgo.toISOString());

  let weekByn = 0;
  let monthByn = 0;
  for (const row of data ?? []) {
    const amount = Number(row.total_byn) || 0;
    monthByn += amount;
    if (new Date(row.purchased_at as string) >= weekAgo) {
      weekByn += amount;
    }
  }

  return {
    weekByn: Number(weekByn.toFixed(2)),
    monthByn: Number(monthByn.toFixed(2)),
  };
}

async function addGramsToPantry(params: {
  profileId: string;
  name: string;
  grams: number;
  userProductId?: string | null;
}) {
  const supabase = await createClient();
  const nameKey = productNameKey(params.name);
  if (!nameKey || params.grams <= 0) return;

  let userProductId = params.userProductId ?? null;
  if (!userProductId) {
    const matched = await getUserProductByNameKey(params.profileId, params.name);
    userProductId = matched?.id ?? null;
  }

  const { data: existing } = await supabase
    .from("pantry_items")
    .select("id, grams_left, user_product_id")
    .eq("profile_id", params.profileId)
    .eq("name_key", nameKey)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    await supabase
      .from("pantry_items")
      .update({
        name: params.name.trim(),
        grams_left: Number(existing.grams_left) + params.grams,
        user_product_id: userProductId ?? existing.user_product_id,
        updated_at: now,
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("pantry_items").insert({
    profile_id: params.profileId,
    name: params.name.trim(),
    name_key: nameKey,
    user_product_id: userProductId,
    grams_left: params.grams,
    updated_at: now,
  });
}

export async function recordPurchase(params: {
  profileId: string;
  source: "manual" | "receipt_text" | "receipt_photo";
  storeName?: string | null;
  items: PurchaseLineInput[];
  rawNote?: string | null;
}) {
  const items = params.items.filter(
    (item) => item.name.trim() && item.grams > 0 && item.priceByn >= 0,
  );
  if (items.length === 0) {
    throw new Error("Нет позиций для покупки.");
  }

  const totalByn = Number(
    items.reduce((sum, item) => sum + item.priceByn, 0).toFixed(2),
  );
  const supabase = await createClient();

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      profile_id: params.profileId,
      purchased_at: new Date().toISOString(),
      store_name: params.storeName?.trim() || null,
      total_byn: totalByn,
      source: params.source,
      raw_note: params.rawNote ?? null,
    })
    .select("id")
    .single();

  if (purchaseError || !purchase) {
    throw new Error(purchaseError?.message ?? "Не удалось сохранить покупку.");
  }

  for (const item of items) {
    const matched = await getUserProductByNameKey(params.profileId, item.name);
    await supabase.from("purchase_items").insert({
      purchase_id: purchase.id,
      name: item.name.trim(),
      grams: item.grams,
      price_byn: item.priceByn,
      user_product_id: matched?.id ?? null,
    });

    await addGramsToPantry({
      profileId: params.profileId,
      name: item.name,
      grams: item.grams,
      userProductId: matched?.id ?? null,
    });
  }

  return { purchaseId: purchase.id as string, totalByn };
}
