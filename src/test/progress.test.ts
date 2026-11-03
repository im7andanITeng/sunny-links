import { beforeEach, describe, expect, it } from "vitest";
import { freshProgress, loadProgress, saveProgress, showPuttingTips, PROGRESS_KEY } from "@/game/progress";

describe("saved game", () => {
  beforeEach(() => localStorage.clear());
  it("shows putting tips only during the six holes of level one", () => {
    expect(showPuttingTips(0)).toBe(true);
    expect(showPuttingTips(5)).toBe(true);
    expect(showPuttingTips(6)).toBe(false);
    expect(showPuttingTips(12)).toBe(false);
  });
  it("restores level two and its exact hole after leaving, with the ball back on the tee", () => {
    const p = { ...freshProgress(8, [2, 3, 3, 2, 4, 3, 2, 4]), strokes: 2,
      ball: { x: 1, z: 3, vx: 0.5, vz: 2, moving: true }, lastPos: [0, 1] as [number, number], clock: 12 };
    saveProgress(p);
    const after = loadProgress();
    expect(after.holeIdx).toBe(8);
    expect(after.scores).toEqual(p.scores);
    expect(after.strokes).toBe(0);
    expect(after.ball.moving).toBe(false);
  });
  it("restores the sixth hole without losing the level scorecard", () => {
    const p = { ...freshProgress(5, [2, 3, 2, 4, 3, 2]), strokes: 2, sunk: true };
    saveProgress(p);
    const after = loadProgress();
    expect(after.holeIdx).toBe(5);
    expect(after.scores).toEqual(p.scores);
  });
  it("falls back safely when a saved game is corrupt", () => {
    localStorage.setItem(PROGRESS_KEY, '{"holeIdx":9}');
    expect(loadProgress().holeIdx).toBe(0);
  });
});