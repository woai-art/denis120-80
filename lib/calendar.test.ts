import { describe, expect, it } from "vitest";
import { dayRangeUtc, toDateKey } from "@/lib/calendar";

describe("calendar", () => {
  it("formats date key in Moscow TZ", () => {
    const key = toDateKey(new Date("2026-07-11T06:00:00.000Z"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds day range for date key", () => {
    const { start, end } = dayRangeUtc("2026-07-11");
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });
});
