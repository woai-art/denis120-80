import { describe, expect, it } from "vitest";
import {
  calculateBmrMale,
  calculateTargets,
  rollingAverage,
} from "./index";

describe("calculateBmrMale", () => {
  it("calculates Denis baseline", () => {
    const bmr = calculateBmrMale({
      weightKg: 120,
      heightCm: 172,
      age: 45,
    });
    expect(bmr).toBeCloseTo(2045, 0);
  });
});

describe("calculateTargets", () => {
  it("respects minimum calories and protein", () => {
    const targets = calculateTargets({
      weightKg: 120,
      heightCm: 172,
      age: 45,
      activityLevel: "sedentary",
    });

    expect(targets.targetKcal).toBeGreaterThanOrEqual(1500);
    expect(targets.targetProteinG).toBeGreaterThanOrEqual(160);
    expect(targets.targetFatG).toBeGreaterThanOrEqual(65);
  });
});

describe("rollingAverage", () => {
  it("returns null for empty input", () => {
    expect(rollingAverage([])).toBeNull();
  });

  it("averages values", () => {
    expect(rollingAverage([100, 102, 104])).toBe(102);
  });
});
