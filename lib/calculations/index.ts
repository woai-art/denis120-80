export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const MIN_KCAL = 1500;
export const DEFAULT_DEFICIT = 400;
export const DEFAULT_WATER_ML = 2500;

export function calculateBmrMale(params: {
  weightKg: number;
  heightCm: number;
  age: number;
}) {
  const { weightKg, heightCm, age } = params;
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 5;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel) {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateTargets(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  deficit?: number;
}) {
  const deficit = params.deficit ?? DEFAULT_DEFICIT;
  const bmr = calculateBmrMale(params);
  const tdee = calculateTdee(bmr, params.activityLevel);
  const targetKcal = Math.max(MIN_KCAL, Math.round(tdee - deficit));
  const targetProteinG = Math.max(160, Math.round(1.8 * params.weightKg));
  const targetFatG = Math.max(65, Math.round(0.8 * params.weightKg));
  const targetCarbsG = Math.max(
    0,
    Math.round((targetKcal - targetProteinG * 4 - targetFatG * 9) / 4),
  );

  return {
    bmr: Math.round(bmr),
    tdee,
    targetKcal,
    targetProteinG,
    targetFatG,
    targetCarbsG,
    targetWaterMl: DEFAULT_WATER_ML,
  };
}

export function calculateAge(birthYear: number, now = new Date()) {
  return now.getFullYear() - birthYear;
}

export function estimateMonthsToGoal(params: {
  startWeightKg: number;
  targetWeightKg: number;
  weeklyLossKg?: number;
}) {
  const weeklyLossKg = params.weeklyLossKg ?? 0.5;
  const totalLoss = params.startWeightKg - params.targetWeightKg;
  return Math.ceil(totalLoss / weeklyLossKg / 4.33);
}

export function rollingAverage(values: number[]) {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

export function calculateBmi(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}
