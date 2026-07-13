-- One-time backfill of user_products from meal history (per 100g from portion)
INSERT INTO user_products (
  profile_id,
  name,
  name_key,
  barcode,
  kcal_per_100g,
  protein_per_100g,
  fat_per_100g,
  carbs_per_100g,
  default_grams,
  last_used_at,
  updated_at
)
SELECT DISTINCT ON (ud.profile_id, lower(trim(mi.name)))
  ud.profile_id,
  trim(mi.name) AS name,
  lower(trim(mi.name)) AS name_key,
  NULL AS barcode,
  round((mi.kcal::numeric * 100) / mi.grams, 1) AS kcal_per_100g,
  round((mi.protein_g::numeric * 100) / mi.grams, 1) AS protein_per_100g,
  round((mi.fat_g::numeric * 100) / mi.grams, 1) AS fat_per_100g,
  round((mi.carbs_g::numeric * 100) / mi.grams, 1) AS carbs_per_100g,
  round(mi.grams::numeric) AS default_grams,
  coalesce(mi.created_at, now()) AS last_used_at,
  now() AS updated_at
FROM meal_items mi
JOIN meals m ON m.id = mi.meal_id
JOIN user_days ud ON ud.id = m.user_day_id
WHERE mi.grams IS NOT NULL
  AND mi.grams > 0
  AND length(trim(mi.name)) > 0
ORDER BY
  ud.profile_id,
  lower(trim(mi.name)),
  coalesce(mi.created_at, now()) DESC
ON CONFLICT (profile_id, name_key) DO UPDATE SET
  kcal_per_100g = EXCLUDED.kcal_per_100g,
  protein_per_100g = EXCLUDED.protein_per_100g,
  fat_per_100g = EXCLUDED.fat_per_100g,
  carbs_per_100g = EXCLUDED.carbs_per_100g,
  default_grams = EXCLUDED.default_grams,
  last_used_at = GREATEST(user_products.last_used_at, EXCLUDED.last_used_at),
  updated_at = now();
