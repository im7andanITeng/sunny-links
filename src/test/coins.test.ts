import { describe, it, expect } from "vitest";
import { skinPrice, coinsFor } from "@/game/coins";
import { SKINS } from "@/game/skins";
import { getHole, PAD_START_HOLE } from "@/game/course";
import { step, PAD_SPEED, solidBoxes } from "@/game/physics";

describe("coins & bounce walls", () => {
  it("God Ball cannot be bought", () => expect(skinPrice(SKINS[SKINS.length - 1]!)).toBeNull());
  it("level-10 skin costs 500 and later skins cost more", () => {
    expect(skinPrice(SKINS[2]!)).toBe(500);
    expect(skinPrice(SKINS[3]!)!).toBeGreaterThan(skinPrice(SKINS[2]!)!);
  });
  it("every hole has coins", () => { for (let i = 0; i < 40; i++) expect(coinsFor(getHole(i), i).length).toBeGreaterThan(0); });
  it("no bounce walls in levels 1-2, they appear from level 3", () => {
    for (let i = 0; i < PAD_START_HOLE; i++) expect(getHole(i).pads.length).toBe(0);
    expect(getHole(PAD_START_HOLE).pads.length).toBeGreaterThan(0);
  });
  it("a bounce wall shoots the ball the way it faces", () => {
    const h = getHole(PAD_START_HOLE + 1), p = h.pads[0]!;
    const ball = { x: p.x + p.dir * 0.5, z: (p.z1 + p.z2) / 2, vx: -p.dir * 3, vz: 0, moving: true };
    step(ball, h, solidBoxes(h), 0.25, 0);
    expect(Math.sign(ball.vx)).toBe(p.dir);
    expect(Math.abs(ball.vx)).toBeGreaterThan(PAD_SPEED * 0.5);
  });
});
