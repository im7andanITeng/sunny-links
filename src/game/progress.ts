import type { Ball } from "./physics";
import { getHole, levelOf } from "./course";

export const PROGRESS_KEY = "sunny-links-progress-v1";
export type Progress = {
  holeIdx: number;
  strokes: number;
  scores: number[];
  sunk: boolean;
  ball: Ball;
  lastPos: [number, number];
  clock: number;
  /** Coin spots already picked up on the current hole. */
  coins?: number[];
};

export function freshProgress(holeIdx = 0, scores: number[] = []): Progress {
  const hole = getHole(holeIdx);
  return { holeIdx, strokes: 0, scores, sunk: false,
    ball: { x: hole.tee[0], z: hole.tee[1], vx: 0, vz: 0, moving: false },
    lastPos: [...hole.tee], clock: 0, coins: [] };
}

export const showPuttingTips = (holeIdx: number) => levelOf(holeIdx) === 0;

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return freshProgress();
    const p: Progress = JSON.parse(raw);
    if (!Number.isSafeInteger(p.holeIdx) || p.holeIdx < 0 ||
      !Number.isSafeInteger(p.strokes) || p.strokes < 0 ||
      !Array.isArray(p.scores) || p.scores.length !== p.holeIdx + (p.sunk ? 1 : 0) ||
      !p.scores.every(s => Number.isSafeInteger(s) && s >= 0) ||
      typeof p.sunk !== "boolean" || typeof p.ball?.moving !== "boolean" ||
      ![p.ball.x, p.ball.z, p.ball.vx, p.ball.vz, p.clock].every(Number.isFinite) ||
      !Array.isArray(p.lastPos) || p.lastPos.length !== 2 || !p.lastPos.every(Number.isFinite)) return freshProgress();
    // Coming back (menu or reopening the game) restarts the hole you were on:
    // ball back on the tee, strokes and picked-up coins reset. The course
    // itself stays the same because every hole is generated from its number.
    const hole = getHole(p.holeIdx);
    return {
      ...p,
      strokes: 0,
      sunk: false,
      coins: [],
      ball: { x: hole.tee[0], z: hole.tee[1], vx: 0, vz: 0, moving: false },
      lastPos: [...hole.tee],
      clock: 0,
    };
  } catch { return freshProgress(); }
}

export function saveProgress(progress: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }
  catch { /* Storage may be unavailable in private browsing. */ }
}
