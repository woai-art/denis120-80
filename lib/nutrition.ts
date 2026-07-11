export type Per100g = {
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
};

export type ScaledNutrition = {
  grams: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export function scaleNutrition(
  per100g: Per100g,
  grams: number,
): ScaledNutrition {
  const factor = grams / 100;
  return {
    grams,
    kcal: Math.round(per100g.kcalPer100g * factor),
    proteinG: Number((per100g.proteinPer100g * factor).toFixed(1)),
    fatG: Number((per100g.fatPer100g * factor).toFixed(1)),
    carbsG: Number((per100g.carbsPer100g * factor).toFixed(1)),
  };
}

/** Convert kJ/100g from package label to kcal/100g */
export function kjToKcalPer100g(kj: number) {
  return Math.round(kj / 4.184);
}
