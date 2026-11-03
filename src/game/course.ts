// Mini-golf course data. Plain TS (no React / three) — units are meters, x/z ground plane.
export type Rect = { x1: number; z1: number; x2: number; z2: number };
export type Bumper = { x: number; z: number; r: number };
export type Spinner = { x: number; z: number; half: number; speed: number };
export type Slope = Rect & { fx: number; fz: number };
/** Bounce pad on a side wall: x is the wall face, dir is the way it shoots (+1 right, -1 left). */
export type Pad = { x: number; z1: number; z2: number; dir: 1 | -1 };
/** Wall that slides left/right: x offset = amp * sin(t * speed). */
export type Mover = Rect & { amp: number; speed: number };
/** One-way teleport: roll into `a`, pop out of `b` keeping your speed. */
export type Teleport = { a: [number, number]; b: [number, number] };
export type Boom = { x: number; z: number; r: number };
export type PowerKind = "bigcup" | "ghost" | "aim";
export type PowerUp = { x: number; z: number; kind: PowerKind };

export type Hole = {
  name: string;
  par: number;
  bounds: Rect;
  tee: [number, number];
  cup: [number, number];
  walls: Rect[];
  sand: Rect[];
  water: Rect[];
  slopes: Slope[];
  bumpers: Bumper[];
  spinners: Spinner[];
  pads: Pad[];
  mud?: Rect[];
  ice?: Rect[];
  movers?: Mover[];
  teleports?: Teleport[];
  booms?: Boom[];
  powerups?: PowerUp[];
  boss?: boolean;
};

const base = { walls: [], sand: [], water: [], slopes: [], bumpers: [], spinners: [], pads: [] };

export const COURSE: Hole[] = [
  {
    ...base,
    name: "Opening Putt",
    par: 2,
    bounds: { x1: 0, z1: 0, x2: 4, z2: 12 },
    tee: [2, 1],
    cup: [2, 10.5],
    bumpers: [{ x: 2, z: 6, r: 0.4 }],
  },
  {
    ...base,
    name: "The Dogleg",
    par: 3,
    bounds: { x1: 0, z1: 0, x2: 10, z2: 10 },
    tee: [2, 1],
    cup: [8.2, 8.3],
    walls: [{ x1: 4, z1: 0, x2: 10, z2: 6 }],
    sand: [{ x1: 0, z1: 7.8, x2: 2.4, z2: 10 }],
    bumpers: [{ x: 5.5, z: 8, r: 0.35 }],
  },
  {
    ...base,
    name: "Windmill",
    par: 3,
    bounds: { x1: 0, z1: 0, x2: 5, z2: 14 },
    tee: [2.5, 1],
    cup: [2.5, 12.3],
    walls: [
      { x1: 0, z1: 6.7, x2: 1.3, z2: 7.3 },
      { x1: 3.7, z1: 6.7, x2: 5, z2: 7.3 },
    ],
    spinners: [{ x: 2.5, z: 7, half: 1.15, speed: 1.3 }],
  },
  {
    ...base,
    name: "Lake Crossing",
    par: 3,
    bounds: { x1: 0, z1: 0, x2: 6, z2: 14 },
    tee: [3, 1],
    cup: [2.5, 12.3],
    water: [{ x1: 0, z1: 5, x2: 3.9, z2: 8.6 }],
    slopes: [{ x1: 3.9, z1: 5, x2: 6, z2: 8.6, fx: -1.6, fz: 0 }],
    bumpers: [{ x: 4.5, z: 11, r: 0.3 }],
  },
  {
    ...base,
    name: "The Hill",
    par: 2,
    bounds: { x1: 0, z1: 0, x2: 5, z2: 12 },
    tee: [2.5, 1],
    cup: [2.5, 10.6],
    slopes: [{ x1: 0, z1: 3.5, x2: 5, z2: 8.5, fx: 0, fz: -2.2 }],
    bumpers: [
      { x: 1.2, z: 9.3, r: 0.25 },
      { x: 3.8, z: 9.3, r: 0.25 },
    ],
  },
  {
    ...base,
    name: "The Gauntlet",
    par: 4,
    bounds: { x1: 0, z1: 0, x2: 6, z2: 18 },
    tee: [1.2, 1],
    cup: [3, 16.8],
    walls: [
      { x1: 0, z1: 4.8, x2: 4.2, z2: 5.3 },
      { x1: 1.8, z1: 10, x2: 6, z2: 10.5 },
    ],
    sand: [{ x1: 4.2, z1: 6.5, x2: 6, z2: 9 }],
    bumpers: [
      { x: 1.5, z: 7.8, r: 0.3 },
      { x: 3, z: 8.6, r: 0.3 },
    ],
    spinners: [{ x: 3, z: 13.8, half: 1.4, speed: -1.7 }],
  },
];

// ---------- Endless procedural holes ----------
const NAMES_A = ["Mossy", "Sunny", "Crooked", "Breezy", "Hidden", "Lazy", "Twisty", "Pebble", "Willow", "Copper", "Maple", "Clover"];
const NAMES_B = ["Lane", "Hollow", "Run", "Bend", "Meadow", "Pass", "Ridge", "Gardens", "Creek", "Alley", "Green", "Trail"];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function generateHole(level: number): Hole {
  const r = rng(level * 7919 + 13);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]!;
  const boss = isBossHole(level);
  const W = boss ? 7 : 4 + Math.floor(r() * 3);
  const L = boss ? 32 : Math.min(26, 11 + level * 0.5 + r() * 4);
  const h: Hole = {
    name: `${pick(NAMES_A)} ${pick(NAMES_B)}`,
    par: 2,
    bounds: { x1: 0, z1: 0, x2: W, z2: L },
    tee: [W / 2 + (r() - 0.5) * (W - 2), 1],
    cup: [1 + r() * (W - 2), L - 1.4],
    walls: [], sand: [], water: [], slopes: [], bumpers: [], spinners: [], pads: [],
  };
  const slots = Math.floor((L - 5) / 3);
  const difficulty = boss ? 1 : Math.min(1, 0.35 + level * 0.04);
  let features = 0;
  for (let i = 0; i < slots; i++) {
    if (r() > difficulty) continue;
    const z = 3 + i * 3 + 1.5;
    const kind = pick(["bumpers", "wall", "sand", "water", "slope", "spinner", "bumpers", "wall"]);
    const left = r() < 0.5;
    const gap = Math.max(1.3, 1.7 - level * 0.006); // openings get tighter
    if (kind === "bumpers") {
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) h.bumpers.push({ x: 0.8 + r() * (W - 1.6), z: z + (r() - 0.5) * 1.6, r: 0.22 + r() * 0.18 });
    } else if (kind === "wall") {
      const len = W - gap - r() * 1;
      h.walls.push(left ? { x1: 0, z1: z - 0.2, x2: len, z2: z + 0.2 } : { x1: W - len, z1: z - 0.2, x2: W, z2: z + 0.2 });
    } else if (kind === "sand") {
      const sw = 1.5 + r() * (W - 2.5), sx = r() * (W - sw);
      h.sand.push({ x1: sx, z1: z - 1.1, x2: sx + sw, z2: z + 1.1 });
    } else if (kind === "water") {
      const ww = W - gap - 0.3;
      h.water.push(left ? { x1: 0, z1: z - 1, x2: ww, z2: z + 1 } : { x1: W - ww, z1: z - 1, x2: W, z2: z + 1 });
    } else if (kind === "slope") {
      const s = (1.2 + r() * 1.5) * (1 + Math.min(0.8, level * 0.01)); // hills get steeper
      const sideways = r() < 0.5;
      h.slopes.push({ x1: 0, z1: z - 1.2, x2: W, z2: z + 1.2, fx: sideways ? (left ? -s : s) : 0, fz: sideways ? 0 : -s });
    } else {
      const half = Math.min(1.4, W / 2 - 0.7);
      h.spinners.push({ x: W / 2, z, half, speed: (left ? 1 : -1) * (1 + r() * 1.2) * (1 + Math.min(1, level * 0.012)) }); // spinners get faster
      h.walls.push({ x1: 0, z1: z - 0.25, x2: W / 2 - half - 0.15, z2: z + 0.25 });
      h.walls.push({ x1: W / 2 + half + 0.15, z1: z - 0.25, x2: W, z2: z + 0.25 });
    }
    features++;
  }
  // Harder and harder: later holes get extra bumpers scattered around (own RNG keeps the layout stable).
  const er = rng(level * 4243 + 77);
  const extra = Math.min(8, Math.floor(level / 8));
  for (let k = 0; k < extra; k++) {
    const b = { x: 0.8 + er() * (W - 1.6), z: 2.5 + er() * (L - 5), r: 0.2 + er() * 0.15 };
    const nearCupOrTee = Math.hypot(b.x - h.cup[0], b.z - h.cup[1]) < 1.2 || Math.hypot(b.x - h.tee[0], b.z - h.tee[1]) < 1.2;
    if (!nearCupOrTee) { h.bumpers.push(b); if (k % 3 === 2) features++; }
  }
  // Bounce walls only show up after level 2 (hole index 12+). Separate RNG keeps old holes unchanged.
  if (level >= PAD_START_HOLE) {
    const pr = rng(level * 31337 + 5);
    const n = 1 + Math.floor(pr() * Math.min(3, 1 + (level - PAD_START_HOLE) / 12));
    for (let k = 0; k < n; k++) {
      const z = 2.5 + pr() * (L - 5), left = pr() < 0.5;
      const pad: Pad = { x: left ? 0 : W, z1: z - 0.6, z2: z + 0.6, dir: left ? 1 : -1 };
      // Keep pads on open wall: never where an inner wall touches that side (or right next to it).
      const blocked = h.walls.some((w) => (left ? w.x1 <= 0.5 : w.x2 >= W - 0.5) && w.z2 > pad.z1 - 0.5 && w.z1 < pad.z2 + 0.5);
      const overlapsPad = h.pads.some((p) => p.x === pad.x && p.z2 > pad.z1 - 0.3 && p.z1 < pad.z2 + 0.3);
      if (!blocked && !overlapsPad) h.pads.push(pad);
    }
  }
  features += addTricks(h, level);
  if (boss) h.name = `👑 Boss: ${h.name}`;
  h.par = Math.min(boss ? 9 : 6, 2 + Math.floor((features + 1) / 2) + (L > 18 ? 1 : 0) + (boss ? 2 : 0));
  return h;
}

/**
 * New tricky stuff, from easiest to hardest. Each one starts at a level (hole index = (level-1)*6).
 * Power-ups L4, Mud L5, Ice L6, Moving walls L7, Teleports L8, Boom pads L9, Boss holes L10.
 */
export const TRICK_START = { powerups: 18, mud: 24, ice: 30, movers: 36, teleports: 42, booms: 48, boss: 54 } as const;

/** Boss hole = last hole of every 5th level, from level 10 on. */
export function isBossHole(i: number): boolean {
  return i >= TRICK_START.boss && holeInLevel(i) === HOLES_PER_LEVEL - 1 && (levelOf(i) + 1) % 5 === 0;
}

function addTricks(h: Hole, level: number): number {
  const W = h.bounds.x2, L = h.bounds.z2;
  const tr = rng(level * 9173 + 41);
  const boss = !!h.boss || isBossHole(level);
  const inR = (q: Rect, x: number, z: number, m = 0) => x >= q.x1 - m && x <= q.x2 + m && z >= q.z1 - m && z <= q.z2 + m;
  const clear = (x: number, z: number) =>
    Math.hypot(x - h.cup[0], z - h.cup[1]) > 1.3 && Math.hypot(x - h.tee[0], z - h.tee[1]) > 1.3 &&
    !h.walls.some((w) => inR(w, x, z, 0.35)) && !h.water.some((w) => inR(w, x, z, 0.3)) &&
    !h.bumpers.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + 0.45) && !h.spinners.some((s) => Math.abs(s.z - z) < 0.8) &&
    !(h.teleports ?? []).some((t) => Math.hypot(t.a[0] - x, t.a[1] - z) < 0.8 || Math.hypot(t.b[0] - x, t.b[1] - z) < 0.8) &&
    !(h.booms ?? []).some((b) => Math.hypot(b.x - x, b.z - z) < 0.8);
  const spot = (z1 = 2.5, z2 = L - 2.5): [number, number] | null => {
    for (let k = 0; k < 40; k++) { const x = 0.6 + tr() * (W - 1.2), z = z1 + tr() * (z2 - z1); if (clear(x, z)) return [x, z]; }
    return null;
  };
  const patch = (): Rect | null => {
    for (let k = 0; k < 20; k++) {
      const pw = 1.4 + tr() * (W - 2), x = tr() * (W - pw), z = 3 + tr() * (L - 6.5);
      const q = { x1: x, z1: z, x2: x + pw, z2: z + 1.6 + tr() };
      const hits = (o: Rect) => o.x1 < q.x2 && o.x2 > q.x1 && o.z1 < q.z2 && o.z2 > q.z1;
      if (!h.water.some(hits) && !h.sand.some(hits) && !(h.mud ?? []).some(hits) && !(h.ice ?? []).some(hits)) return q;
    }
    return null;
  };
  let f = 0;
  const on = (k: keyof typeof TRICK_START) => level >= TRICK_START[k];
  if (on("mud") && (boss || tr() < 0.6)) { const q = patch(); if (q) { (h.mud ??= []).push(q); f++; } }
  if (on("ice") && (boss || tr() < 0.6)) { const q = patch(); if (q) { (h.ice ??= []).push(q); f++; } }
  if (on("movers") && (boss || tr() < 0.55)) {
    for (let k = 0; k < 20; k++) {
      const z = 4 + tr() * (L - 8);
      if (h.walls.some((w) => Math.abs((w.z1 + w.z2) / 2 - z) < 1.2) || h.spinners.some((s) => Math.abs(s.z - z) < 1.5)) continue;
      const bw = 1.3, amp = (W - bw) / 2 - 0.15;
      (h.movers ??= []).push({ x1: W / 2 - bw / 2, z1: z - 0.18, x2: W / 2 + bw / 2, z2: z + 0.18, amp, speed: (0.9 + tr() * 0.8) * (tr() < 0.5 ? 1 : -1) });
      f++; break;
    }
  }
  if (on("teleports") && (boss || tr() < 0.5)) {
    const a = spot(2.5, L * 0.5), b = a && spot(L * 0.55, L - 2);
    if (a && b) { (h.teleports ??= []).push({ a, b }); }
  }
  if (on("booms") && (boss || tr() < 0.5)) {
    const n = boss ? 3 : 1 + Math.floor(tr() * 2);
    for (let k = 0; k < n; k++) { const p = spot(); if (p) { (h.booms ??= []).push({ x: p[0], z: p[1], r: 0.28 }); f++; } }
  }
  if (on("powerups") && (boss || tr() < 0.45)) {
    const p = spot(1.8, L * 0.6);
    const kinds: PowerKind[] = ["bigcup", "ghost", "aim"];
    if (p) (h.powerups ??= []).push({ x: p[0], z: p[1], kind: kinds[Math.floor(tr() * 3)]! });
  }
  if (boss) h.boss = true;
  return f;
}

const cache = new Map<number, Hole>();
/** Hole by 0-based index: hand-made course first, then endless generated holes. */
export function getHole(i: number): Hole {
  if (i < COURSE.length) return COURSE[i]!;
  let h = cache.get(i);
  if (!h) { h = generateHole(i); cache.set(i, h); }
  return h;
}

/** First hole index that can have bounce walls (start of level 3). */
export const PAD_START_HOLE = 12;

// ---------- Levels: every HOLES_PER_LEVEL holes clears a level ----------
export const HOLES_PER_LEVEL = 6;
/** 0-based level number for a 0-based hole index. */
export const levelOf = (i: number) => Math.floor(i / HOLES_PER_LEVEL);
/** 0-based position of a hole inside its level. */
export const holeInLevel = (i: number) => i % HOLES_PER_LEVEL;

/** Display name for a 0-based level number: levels are simply numbered. */
export function levelName(level: number): string {
  return `Level ${level + 1}`;
}

/**
 * Star rating for a finished level: 3 stars at par or better,
 * 2 stars within 6 over par, 1 star within 12 over par, else 0.
 */
export function computeStars(strokes: number, par: number): number {
  const over = strokes - par;
  if (over <= 0) return 3;
  if (over <= 6) return 2;
  if (over <= 12) return 1;
  return 0;
}
