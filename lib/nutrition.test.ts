import { describe, expect, it } from "vitest";
import { kjToKcalPer100g, scaleNutrition } from "@/lib/nutrition";

describe("scaleNutrition", () => {
  it("scales oatmeal packet values", () => {
    const twoPackets = scaleNutrition(
      { kcalPer100g: 365, proteinPer100g: 9.8, fatPer100g: 5.1, carbsPer100g: 66 },
      80,
    );
    expect(twoPackets.kcal).toBe(292);
    expect(twoPackets.proteinG).toBe(7.8);
  });

  it("converts kJ label to kcal", () => {
    expect(kjToKcalPer100g(1528)).toBe(365);
  });
});
