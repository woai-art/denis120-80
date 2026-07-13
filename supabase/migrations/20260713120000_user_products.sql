-- Personal product library (manual + barcode), for one-tap re-add
CREATE TABLE IF NOT EXISTS user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_key text NOT NULL,
  barcode text,
  kcal_per_100g numeric NOT NULL,
  protein_per_100g numeric NOT NULL DEFAULT 0,
  fat_per_100g numeric NOT NULL DEFAULT 0,
  carbs_per_100g numeric NOT NULL DEFAULT 0,
  default_grams numeric NOT NULL DEFAULT 100,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, name_key),
  UNIQUE (profile_id, barcode)
);

ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products"
  ON user_products
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS user_products_profile_last_used_idx
  ON user_products (profile_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS user_products_profile_barcode_idx
  ON user_products (profile_id, barcode)
  WHERE barcode IS NOT NULL;
