export type DayTemplateType = "night_shift" | "recovery" | "day_off";

export type ScheduleBlock = {
  start: string;
  end: string;
  label?: string;
};

export type MealWindow = {
  start: string;
  end: string;
  mealType: string;
  label: string;
};

export type DaySchedule = {
  sleep: ScheduleBlock[];
  work: ScheduleBlock[];
  free: ScheduleBlock[];
  meal_windows: MealWindow[];
};

export type Profile = {
  id: string;
  display_name: string;
  height_cm: number;
  gender: "male" | "female";
  birth_year: number;
  start_weight_kg: number;
  target_weight_kg: number;
  target_months: number;
  activity_level: string;
  timezone: string;
  medical_ack_at: string;
  tdee_kcal: number | null;
  target_kcal: number | null;
  target_protein_g: number | null;
  target_fat_g: number | null;
  target_carbs_g: number | null;
  target_water_ml: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type UserDay = {
  id: string;
  profile_id: string;
  day_template_type: DayTemplateType;
  woke_at: string;
  closed_at: string | null;
  sleep_quality: number | null;
  notes: string | null;
  created_at: string;
};

export type FoodTemplate = {
  id: string;
  profile_id: string;
  name: string;
  default_grams: number | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  sort_order: number;
};

export type MealItem = {
  id: string;
  meal_id: string;
  name: string;
  grams: number | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  source: string;
  barcode: string | null;
  off_product_id: string | null;
  created_at: string;
};

export type DashboardSummary = {
  profile: Profile;
  userDay: UserDay | null;
  totals: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    water_ml: number;
  };
  weightAvg7d: number | null;
  latestWeight: number | null;
  insight: {
    tip: string;
    action: string;
    focus: string;
  } | null;
};

export const DEFAULT_SCHEDULES: Record<DayTemplateType, DaySchedule> = {
  night_shift: {
    sleep: [
      { start: "08:00", end: "12:00", label: "Сон 1" },
      { start: "14:00", end: "17:00", label: "Сон 2" },
    ],
    work: [{ start: "22:00", end: "06:00", label: "Ночная смена" }],
    free: [],
    meal_windows: [
      { start: "12:00", end: "14:00", mealType: "breakfast", label: "После сна" },
      { start: "17:00", end: "19:00", mealType: "main", label: "Перед сменой" },
      { start: "00:00", end: "02:00", mealType: "snack", label: "Во время смены" },
      { start: "06:00", end: "08:00", mealType: "dinner", label: "После смены" },
    ],
  },
  recovery: {
    sleep: [
      { start: "02:00", end: "10:00", label: "Основной сон" },
      { start: "14:00", end: "16:00", label: "Доп. сон" },
    ],
    work: [],
    free: [{ start: "10:00", end: "23:00", label: "Отдых" }],
    meal_windows: [
      { start: "10:00", end: "11:00", mealType: "breakfast", label: "После сна" },
      { start: "13:00", end: "14:00", mealType: "main", label: "Обед" },
      { start: "18:00", end: "19:00", mealType: "main", label: "Ужин" },
      { start: "21:00", end: "22:00", mealType: "snack", label: "Перекус" },
    ],
  },
  day_off: {
    sleep: [{ start: "01:00", end: "09:00", label: "Сон" }],
    work: [],
    free: [{ start: "09:00", end: "01:00", label: "Выходной" }],
    meal_windows: [
      { start: "09:00", end: "10:00", mealType: "breakfast", label: "Завтрак" },
      { start: "13:00", end: "14:00", mealType: "main", label: "Обед" },
      { start: "17:00", end: "18:00", mealType: "snack", label: "Перекус" },
      { start: "20:00", end: "21:00", mealType: "dinner", label: "Ужин" },
    ],
  },
};

export const DEFAULT_FOOD_TEMPLATES = [
  {
    name: "Творог с мёдом",
    default_grams: 200,
    kcal: 220,
    protein_g: 28,
    fat_g: 4,
    carbs_g: 22,
    sort_order: 1,
  },
  {
    name: "Протеиновый коктейль",
    default_grams: 300,
    kcal: 180,
    protein_g: 30,
    fat_g: 2,
    carbs_g: 8,
    sort_order: 2,
  },
  {
    name: "Стандартный перекус",
    default_grams: 100,
    kcal: 150,
    protein_g: 10,
    fat_g: 5,
    carbs_g: 15,
    sort_order: 3,
  },
];
