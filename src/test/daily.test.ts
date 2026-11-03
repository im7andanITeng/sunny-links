import { describe, expect, it } from "vitest";
import { dailyHole, dayKey, monthComplete } from "@/game/daily";

describe("daily challenge", () => {
  it("same day gives the same hole", () => expect(dailyHole("2026-11-01")).toEqual(dailyHole("2026-11-01")));
  it("whole month played earns the prize", () => {
    const all = Array.from({ length: 30 }, (_, i) => dayKey(2026, 10, i + 1));
    expect(monthComplete(all, 2026, 10)).toBe(true);
  });
  it("missing one day means no prize", () => {
    const most = Array.from({ length: 30 }, (_, i) => dayKey(2026, 10, i + 1)).filter((k) => k !== "2026-11-15");
    expect(monthComplete(most, 2026, 10)).toBe(false);
  });
});

describe("month end", () => {
  it("last 3 days are harder", async () => {
    const { isFinalDays } = await import("@/game/daily");
    expect(isFinalDays("2026-11-28")).toBe(true);
    expect(isFinalDays("2026-11-27")).toBe(false);
  });
});
