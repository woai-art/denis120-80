import type { Per100g } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

export type UserProduct = {
  id: string;
  name: string;
  barcode: string | null;
  defaultGrams: number;
  per100g: Per100g;
  lastUsedAt: string;
};

export function productNameKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function upsertUserProduct(params: {
  profileId: string;
  name: string;
  grams: number;
  per100g: Per100g;
  barcode?: string | null;
}) {
  const supabase = await createClient();
  const nameKey = productNameKey(params.name);
  if (!nameKey) return;

  const barcode =
    params.barcode && params.barcode.trim().length >= 6
      ? params.barcode.trim()
      : null;
  const now = new Date().toISOString();
  const defaultGrams = Math.max(1, Math.round(params.grams));

  const base = {
    name: params.name.trim(),
    name_key: nameKey,
    kcal_per_100g: params.per100g.kcalPer100g,
    protein_per_100g: params.per100g.proteinPer100g,
    fat_per_100g: params.per100g.fatPer100g,
    carbs_per_100g: params.per100g.carbsPer100g,
    default_grams: defaultGrams,
    last_used_at: now,
    updated_at: now,
  };

  if (barcode) {
    const { data: byBarcode } = await supabase
      .from("user_products")
      .select("id")
      .eq("profile_id", params.profileId)
      .eq("barcode", barcode)
      .maybeSingle();

    if (byBarcode) {
      await supabase
        .from("user_products")
        .update(base)
        .eq("id", byBarcode.id);
      return;
    }
  }

  const { data: byName } = await supabase
    .from("user_products")
    .select("id, barcode")
    .eq("profile_id", params.profileId)
    .eq("name_key", nameKey)
    .maybeSingle();

  if (byName) {
    await supabase
      .from("user_products")
      .update({
        ...base,
        barcode: barcode ?? byName.barcode,
      })
      .eq("id", byName.id);
    return;
  }

  await supabase.from("user_products").insert({
    profile_id: params.profileId,
    ...base,
    barcode,
  });
}

export async function getMyProducts(profileId: string): Promise<UserProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_products")
    .select("*")
    .eq("profile_id", profileId)
    .order("last_used_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    barcode: (row.barcode as string | null) ?? null,
    defaultGrams: Number(row.default_grams) || 100,
    per100g: {
      kcalPer100g: Number(row.kcal_per_100g),
      proteinPer100g: Number(row.protein_per_100g),
      fatPer100g: Number(row.fat_per_100g),
      carbsPer100g: Number(row.carbs_per_100g),
    },
    lastUsedAt: row.last_used_at as string,
  }));
}

export async function getUserProductById(
  profileId: string,
  productId: string,
): Promise<UserProduct | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_products")
    .select("*")
    .eq("profile_id", profileId)
    .eq("id", productId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    barcode: (data.barcode as string | null) ?? null,
    defaultGrams: Number(data.default_grams) || 100,
    per100g: {
      kcalPer100g: Number(data.kcal_per_100g),
      proteinPer100g: Number(data.protein_per_100g),
      fatPer100g: Number(data.fat_per_100g),
      carbsPer100g: Number(data.carbs_per_100g),
    },
    lastUsedAt: data.last_used_at as string,
  };
}

export async function getUserProductByNameKey(
  profileId: string,
  name: string,
): Promise<UserProduct | null> {
  const supabase = await createClient();
  const nameKey = productNameKey(name);
  if (!nameKey) return null;

  const { data } = await supabase
    .from("user_products")
    .select("*")
    .eq("profile_id", profileId)
    .eq("name_key", nameKey)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    barcode: (data.barcode as string | null) ?? null,
    defaultGrams: Number(data.default_grams) || 100,
    per100g: {
      kcalPer100g: Number(data.kcal_per_100g),
      proteinPer100g: Number(data.protein_per_100g),
      fatPer100g: Number(data.fat_per_100g),
      carbsPer100g: Number(data.carbs_per_100g),
    },
    lastUsedAt: data.last_used_at as string,
  };
}

