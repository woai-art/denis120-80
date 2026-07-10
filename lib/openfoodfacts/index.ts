import { createClient } from "@/lib/supabase/server";

export type OffProduct = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
};

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const CACHE_TTL_DAYS = 30;

type OffRawProduct = {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
  };
};

function mapProduct(raw: OffRawProduct): OffProduct | null {
  const name = raw.product_name_ru || raw.product_name;
  const nutriments = raw.nutriments;
  if (!name || !nutriments || nutriments["energy-kcal_100g"] == null) {
    return null;
  }

  return {
    id: raw.code ?? raw._id ?? name,
    barcode: raw.code ?? null,
    name,
    brand: raw.brands?.split(",")[0]?.trim() || null,
    kcalPer100g: Math.round(nutriments["energy-kcal_100g"]),
    proteinPer100g: Number((nutriments.proteins_100g ?? 0).toFixed(1)),
    fatPer100g: Number((nutriments.fat_100g ?? 0).toFixed(1)),
    carbsPer100g: Number((nutriments.carbohydrates_100g ?? 0).toFixed(1)),
  };
}

export async function searchProducts(query: string): Promise<OffProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "10",
    fields: "code,product_name,product_name_ru,brands,nutriments",
  });

  const response = await fetch(`${OFF_SEARCH_URL}?${params}`, {
    headers: { "User-Agent": "Denis120-80/1.0 (personal weight tracker)" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { products?: OffRawProduct[] };
  return (data.products ?? [])
    .map(mapProduct)
    .filter((product): product is OffProduct => product !== null);
}

export async function getProductByBarcode(
  barcode: string,
): Promise<OffProduct | null> {
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

  const response = await fetch(
    `${OFF_PRODUCT_URL}/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_ru,brands,nutriments`,
    {
      headers: { "User-Agent": "Denis120-80/1.0 (personal weight tracker)" },
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    status?: number;
    product?: OffRawProduct;
  };

  if (data.status !== 1 || !data.product) return null;

  const product = mapProduct(data.product);
  if (!product) return null;

  await supabase.from("off_cache").upsert({
    barcode,
    product_json: product,
    fetched_at: new Date().toISOString(),
  });

  return product;
}
