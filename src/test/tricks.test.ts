import { describe, expect, it } from "vitest";
import { getHole, isBossHole, TRICK_START } from "@/game/course";

const has = (i: number, k: "mud" | "ice" | "movers" | "teleports" | "booms" | "powerups") => (getHole(i)[k]?.length ?? 0) > 0;
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, k) => a + k);

describe("tricky stuff order", () => {
  it("each trick never shows before its level, and does show after", () => {
    for (const k of ["powerups", "mud", "ice", "movers", "teleports", "booms"] as const) {
      expect(range(0, TRICK_START[k]).some((i) => has(i, k))).toBe(false);
      expect(range(TRICK_START[k], TRICK_START[k] + 30).some((i) => has(i, k))).toBe(true);
    }
  });
  it("starts easiest to hardest: power-ups L4 ... boss L10", () => {
    expect(TRICK_START).toEqual({ powerups: 18, mud: 24, ice: 30, movers: 36, teleports: 42, booms: 48, boss: 54 });
  });
  it("boss hole is the last hole of level 10, 15, 20", () => {
    expect(isBossHole(59)).toBe(true);
    expect(isBossHole(89)).toBe(true);
    expect(isBossHole(29)).toBe(false);
    expect(isBossHole(58)).toBe(false);
    expect(getHole(59).boss).toBe(true);
    expect(getHole(59).bounds.z2).toBe(32);
  });
});
