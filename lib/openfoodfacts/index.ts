import { createClient } from "@/lib/supabase/server";
import { kjToKcalPer100g } from "@/lib/nutrition";

export type OffProduct = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  source: "open_food_facts" | "user_barcode" | "user_saved";
};

const OFF_INSTANCES = [
  "https://world.openfoodfacts.org",
  "https://ru.openfoodfacts.org",
  "https://by.openfoodfacts.org",
] as const;

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const CACHE_TTL_DAYS = 30;

type OffRawProduct = {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    "energy-kj_100g"?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
  };
};

function extractKcalPer100g(nutriments: OffRawProduct["nutriments"]): number | null {
  if (!nutriments) return null;
  if (nutriments["energy-kcal_100g"] != null) {
    return Math.round(nutriments["energy-kcal_100g"]);
  }
  if (nutriments["energy-kj_100g"] != null) {
    return kjToKcalPer100g(nutriments["energy-kj_100g"]);
  }
  return null;
}

function mapProduct(
  raw: OffRawProduct,
  source: OffProduct["source"] = "open_food_facts",
): OffProduct | null {
  const name = raw.product_name_ru || raw.product_name;
  const kcalPer100g = extractKcalPer100g(raw.nutriments);
  if (!name || kcalPer100g == null) {
    return null;
  }

  return {
    id: raw.code ?? raw._id ?? name,
    barcode: raw.code ?? null,
    name,
    brand: raw.brands?.split(",")[0]?.trim() || null,
    kcalPer100g,
    proteinPer100g: Number((raw.nutriments?.proteins_100g ?? 0).toFixed(1)),
    fatPer100g: Number((raw.nutriments?.fat_100g ?? 0).toFixed(1)),
    carbsPer100g: Number((raw.nutriments?.carbohydrates_100g ?? 0).toFixed(1)),
    source,
  };
}

async function fetchOffBarcode(
  baseUrl: string,
  barcode: string,
): Promise<OffProduct | null> {
  const response = await fetch(
    `${baseUrl}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_ru,brands,nutriments`,
    {
      headers: { "User-Agent": "Denis120-80/1.0 (personal weight tracker)" },
      next: { revalidate: 86400 },
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    status?: number;
    product?: OffRawProduct;
  };

  if (data.status !== 1 || !data.product) return null;
  return mapProduct(data.product);
}

export async function searchProducts(query: string): Promise<OffProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "10",
    countries_tags_en: "belarus,russia",
    fields: "code,product_name,product_name_ru,brands,nutriments",
  });

  const response = await fetch(`${OFF_SEARCH_URL}?${params}`, {
    headers: { "User-Agent": "Denis120-80/1.0 (personal weight tracker)" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { products?: OffRawProduct[] };
  return (data.products ?? [])
    .map((p) => mapProduct(p))
    .filter((product): product is OffProduct => product !== null);
}

export async function getUserBarcodeProduct(
  profileId: string,
  barcode: string,
): Promise<OffProduct | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_barcode_products")
    .select("*")
    .eq("profile_id", profileId)
    .eq("barcode", barcode)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    barcode: data.barcode,
    name: data.name,
    brand: null,
    kcalPer100g: Number(data.kcal_per_100g),
    proteinPer100g: Number(data.protein_per_100g),
    fatPer100g: Number(data.fat_per_100g),
    carbsPer100g: Number(data.carbs_per_100g),
    source: "user_barcode",
  };
}

export async function getProductByBarcode(
  barcode: string,
  profileId?: string,
): Promise<OffProduct | null> {
  if (profileId) {
    const userProduct = await getUserBarcodeProduct(profileId, barcode);
    if (userProduct) return userProduct;
  }

  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("off_cache")
    .select("product_json, fetched_at")
    .eq("barcode", barcode)
    .maybeSingle();

  if (cached) {
    const ageMs = Date.now() - new Date(cached.fetched_at).getTime();
    if (ageMs < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) {
      return cached.product_json as OffProduct;
    }
  }

  for (const baseUrl of OFF_INSTANCES) {
    const product = await fetchOffBarcode(baseUrl, barcode);
    if (product) {
      await supabase.from("off_cache").upsert({
        barcode,
        product_json: product,
        fetched_at: new Date().toISOString(),
      });
      return product;
    }
  }

  return null;
}
