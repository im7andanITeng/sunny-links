import { describe, it, expect, beforeEach } from "vitest";
import { loadProgress, saveProgress, freshProgress, PROGRESS_KEY } from "../game/progress";
import { getHole } from "../game/course";

beforeEach(() => localStorage.clear());

describe("loadProgress restarts the current hole", () => {
  it("sends the ball back to the tee and clears strokes, keeping the same hole", () => {
    const p = freshProgress(7, [3, 3, 4, 2, 3, 4, 5]);
    p.strokes = 4;
    p.ball = { x: 2, z: 9, vx: 1, vz: -1, moving: true };
    p.coins = [0, 2];
    saveProgress(p);

    const after = loadProgress();

    expect(after.holeIdx).toBe(7); // same course (holes are generated from their number)
    expect(after.strokes).toBe(0);
    expect(after.coins).toEqual([]);
    expect(after.ball.moving).toBe(false);
    expect([after.ball.x, after.ball.z]).toEqual(getHole(7).tee);
    expect(after.scores).toEqual(p.scores); // finished holes stay finished
  });

  it("keeps the same generated course after a menu trip (deterministic holes)", () => {
    expect(getHole(20)).toEqual(getHole(20));
  });

  it("starts fresh when the save is corrupted", () => {
    localStorage.setItem(PROGRESS_KEY, "{not json");
    expect(loadProgress().holeIdx).toBe(0);
  });
});
