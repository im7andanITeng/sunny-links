// Admin "cheat sheet" — gameplay overrides an admin can switch on with the AI assistant.
// Plain TS + a tiny store so the game and the admin panel stay in sync.
import { useEffect, useState } from "react";
import type { Hole } from "./course";

export type Cheats = {
  /** Ball speed multiplier: 1 = normal. */
  speedMult: number;
  /** Ball size multiplier: 1 = normal. */
  ballScale: number;
  /** Cup (hole) size multiplier: 1 = normal. */
  cupScale: number;
  /** The whole floor turns to mud. */
  allMud: boolean;
  /** The whole floor turns to ice. */
  allIce: boolean;
  /** Spooky sky, fog and lights. */
  spooky: boolean;
  /** Ball rolls straight through the walls. */
  ghost: boolean;
  /** The aim line is always on. */
  aim: boolean;
  /** Every hole is stuffed with coins. */
  coinRain: boolean;
};

export const NO_CHEATS: Cheats = {
  speedMult: 1,
  ballScale: 1,
  cupScale: 1,
  allMud: false,
  allIce: false,
  spooky: false,
  ghost: false,
  aim: false,
  coinRain: false,
};

const KEY = "sunny-links-cheats";

const num = (v: unknown, min: number, max: number, dflt: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : dflt;
const bool = (v: unknown, dflt: boolean) => (typeof v === "boolean" ? v : dflt);

/** Keep only known switches, and never let a number go crazy. */
export function clampCheats(raw: Partial<Cheats> | null | undefined): Cheats {
  const r = raw ?? {};
  return {
    speedMult: num(r.speedMult, 0.2, 5, 1),
    ballScale: num(r.ballScale, 0.4, 5, 1),
    cupScale: num(r.cupScale, 0.2, 4, 1),
    allMud: bool(r.allMud, false),
    allIce: bool(r.allIce, false),
    spooky: bool(r.spooky, false),
    ghost: bool(r.ghost, false),
    aim: bool(r.aim, false),
    coinRain: bool(r.coinRain, false),
  };
}

export function loadCheats(): Cheats {
  try {
    return clampCheats(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Cheats>);
  } catch {
    return { ...NO_CHEATS };
  }
}

export function saveCheats(c: Cheats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage full or blocked — cheats just won't persist */
  }
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function setCheats(c: Cheats) {
  const next = clampCheats(c);
  saveCheats(next);
  emit();
}

export function clearCheats() {
  setCheats(NO_CHEATS);
}

export function hasCheats(c: Cheats) {
  return JSON.stringify(c) !== JSON.stringify(NO_CHEATS);
}

/** Live view of the cheat sheet — re-renders whenever an admin changes it. */
export function useCheats(): Cheats {
  const [c, setC] = useState<Cheats>(() => (typeof window === "undefined" ? { ...NO_CHEATS } : loadCheats()));
  useEffect(() => {
    const l = () => setC(loadCheats());
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return c;
}

/** Mud / ice over the whole fairway. */
export function cheatHole(hole: Hole, c: Cheats): Hole {
  if (!c.allMud && !c.allIce) return hole;
  const floor: typeof hole.mud = [{ x1: hole.bounds.x1, z1: hole.bounds.z1, x2: hole.bounds.x2, z2: hole.bounds.z2 }];
  const next: Hole = { ...hole };
  if (c.allMud) next.mud = floor;
  if (c.allIce) next.ice = floor;
  return next;
}

/** A small deterministic jitter so a "coin rain" looks the same each visit. */
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Coins sprinkled over the whole hole for the coin-rain cheat. */
export function rainCoins(hole: Hole, holeIdx: number): [number, number][] {
  const r = rng(holeIdx + 7);
  const out: [number, number][] = [];
  const { x1, z1, x2, z2 } = hole.bounds;
  for (let gx = 0; gx < 5; gx++) {
    for (let gz = 0; gz < 4; gz++) {
      const x = x1 + ((gx + 0.5) / 5) * (x2 - x1) + (r() - 0.5) * 0.5;
      const z = z1 + ((gz + 0.5) / 4) * (z2 - z1) + (r() - 0.5) * 0.5;
      if (hole.water.some((w) => x >= w.x1 && x <= w.x2 && z >= w.z1 && z <= w.z2)) continue;
      if (Math.hypot(x - hole.cup[0], z - hole.cup[1]) < 0.5) continue;
      if (Math.hypot(x - hole.tee[0], z - hole.tee[1]) < 0.5) continue;
      out.push([x, z]);
    }
  }
  return out;
}
