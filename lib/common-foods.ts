import type { Per100g } from "@/lib/nutrition";

export type CommonFood = {
  id: string;
  name: string;
  defaultGrams: number;
  per100g: Per100g;
  hint?: string;
};

/** Справочные значения (средние, на 100 г). Источник: таблицы химического состава. */
export const COMMON_FOODS: CommonFood[] = [
  {
    id: "biotech_pure_whey",
    name: "BioTechUSA Pure Whey (шоколад-кокос)",
    defaultGrams: 28,
    per100g: {
      kcalPer100g: 382,
      proteinPer100g: 75,
      fatPer100g: 6.4,
      carbsPer100g: 5.4,
    },
    hint: "1 порция = 2 ст. ложки (28 г). 250 мл воды — +250 мл на вкладке «День»",
  },
  {
    id: "tomato",
    name: "Помидор",
    defaultGrams: 150,
    per100g: { kcalPer100g: 18, proteinPer100g: 0.9, fatPer100g: 0.2, carbsPer100g: 3.9 },
    hint: "1 средний ≈ 120–150 г",
  },
  {
    id: "cucumber",
    name: "Огурец",
    defaultGrams: 150,
    per100g: { kcalPer100g: 15, proteinPer100g: 0.8, fatPer100g: 0.1, carbsPer100g: 2.8 },
    hint: "1 средний ≈ 120–200 г",
  },
  {
    id: "apple",
    name: "Яблоко",
    defaultGrams: 180,
    per100g: { kcalPer100g: 52, proteinPer100g: 0.3, fatPer100g: 0.2, carbsPer100g: 14 },
    hint: "1 среднее ≈ 150–200 г",
  },
  {
    id: "egg_boiled",
    name: "Яйцо куриное (варёное)",
    defaultGrams: 55,
    per100g: { kcalPer100g: 155, proteinPer100g: 13, fatPer100g: 11, carbsPer100g: 1.1 },
    hint: "1 шт ≈ 50–60 г",
  },
  {
    id: "cottage_cheese_1",
    name: "Творог 1%",
    defaultGrams: 200,
    per100g: { kcalPer100g: 71, proteinPer100g: 16, fatPer100g: 1, carbsPer100g: 3.3 },
    hint: "Савушкин и аналоги — смотри упаковку",
  },
  {
    id: "chicken_breast",
    name: "Куриная грудка (варёная)",
    defaultGrams: 150,
    per100g: { kcalPer100g: 165, proteinPer100g: 31, fatPer100g: 3.6, carbsPer100g: 0 },
  },
];
