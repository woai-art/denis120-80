-- Pantry / fridge + purchases with BYN prices
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  store_name text,
  total_byn numeric NOT NULL DEFAULT 0,
  source text NOT NULL CHECK (source IN ('manual', 'receipt_text', 'receipt_photo')),
  raw_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  name text NOT NULL,
  grams numeric NOT NULL CHECK (grams > 0),
  price_byn numeric NOT NULL DEFAULT 0 CHECK (price_byn >= 0),
  user_product_id uuid REFERENCES user_products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_key text NOT NULL,
  user_product_id uuid REFERENCES user_products(id) ON DELETE SET NULL,
  grams_left numeric NOT NULL CHECK (grams_left >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, name_key)
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own purchases"
  ON purchases FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users manage own purchase items"
  ON purchase_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_items.purchase_id AND p.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_items.purchase_id AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own pantry"
  ON pantry_items FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS purchases_profile_purchased_idx
  ON purchases (profile_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS pantry_items_profile_updated_idx
  ON pantry_items (profile_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS purchase_items_purchase_idx
  ON purchase_items (purchase_id);
