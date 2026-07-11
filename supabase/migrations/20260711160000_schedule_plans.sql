-- Planned work schedule per calendar date (independent of wake-to-wake user_days)
CREATE TABLE IF NOT EXISTS schedule_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  day_template_type text NOT NULL CHECK (
    day_template_type IN ('night_shift', 'recovery', 'day_off')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, plan_date)
);

ALTER TABLE schedule_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedule plans"
  ON schedule_plans
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS schedule_plans_profile_date_idx
  ON schedule_plans (profile_id, plan_date);
