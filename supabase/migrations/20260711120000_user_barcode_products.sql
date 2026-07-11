-- Personal barcode products (when Open Food Facts has no BY/RU entry)
CREATE TABLE IF NOT EXISTS user_barcode_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  name text NOT NULL,
  kcal_per_100g numeric NOT NULL,
  protein_per_100g numeric NOT NULL DEFAULT 0,
  fat_per_100g numeric NOT NULL DEFAULT 0,
  carbs_per_100g numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, barcode)
);

ALTER TABLE user_barcode_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own barcode products"
  ON user_barcode_products
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS user_barcode_products_profile_barcode_idx
  ON user_barcode_products (profile_id, barcode);
