import { describe, expect, it } from "vitest";
import { cheatHole, clampCheats, NO_CHEATS, rainCoins } from "@/game/cheats";
import type { Hole } from "@/game/course";

const hole: Hole = {
  name: "Test",
  par: 3,
  bounds: { x1: 0, z1: 0, x2: 6, z2: 4 },
  tee: [1, 1],
  cup: [5, 3],
  walls: [],
  sand: [],
  water: [{ x1: 2, z1: 1, x2: 3, z2: 3 }],
  slopes: [],
  bumpers: [],
  spinners: [],
  pads: [],
};

describe("admin cheat sheet", () => {
  it("keeps multipliers inside safe bounds", () => {
    expect(clampCheats({ speedMult: 99, ballScale: 0, cupScale: -4 })).toEqual({
      ...NO_CHEATS,
      speedMult: 5,
      ballScale: 0.4,
      cupScale: 0.2,
    });
  });

  it("ignores junk and keeps defaults", () => {
    expect(clampCheats({ speedMult: "fast", spooky: "yes" } as never)).toEqual(NO_CHEATS);
  });

  it("all-mud turns the whole fairway into mud", () => {
    const h = cheatHole(hole, { ...NO_CHEATS, allMud: true });
    expect(h.mud).toEqual([{ x1: 0, z1: 0, x2: 6, z2: 4 }]);
    expect(cheatHole(hole, NO_CHEATS)).toBe(hole);
  });

  it("coin rain skips water, the cup and the tee, and is the same every time", () => {
    const a = rainCoins(hole, 3);
    const b = rainCoins(hole, 3);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    for (const [x, z] of a) {
      expect(x >= 2 && x <= 3 && z >= 1 && z <= 3).toBe(false);
      expect(Math.hypot(x - 5, z - 3) < 0.5).toBe(false);
      expect(Math.hypot(x - 1, z - 1) < 0.5).toBe(false);
    }
  });
});
