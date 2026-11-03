// Coins: collected on holes, spent on ball skins. Plain TS.
import type { Hole } from "./course";
import type { Skin } from "./skins";

export const COIN_VALUE = 10;
export const COIN_R = 0.16;
const WALLET_KEY = "sunny-links-coins";
const BOUGHT_KEY = "sunny-links-bought";

/** Skins get pricier the later they are: #1 = 300, #2 = 500, … God Ball can't be bought. */
export function skinPrice(s: Skin): number | null {
  if (s.pattern === "god" || s.id === 0) return null;
  return 100 + s.id * 200;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const inR = (r: { x1: number; z1: number; x2: number; z2: number }, x: number, z: number, m = 0.3) =>
  x >= r.x1 - m && x <= r.x2 + m && z >= r.z1 - m && z <= r.z2 + m;

/** Deterministic coin spots for a hole (2–4), kept off walls, water and bumpers. */
export function coinsFor(hole: Hole, holeIdx: number): [number, number][] {
  const r = rng(holeIdx * 104729 + 7);
  const b = hole.bounds, out: [number, number][] = [];
  const want = 2 + Math.floor(r() * 3) + (hole.boss ? 5 : 0); // boss holes pay extra
  for (let tries = 0; tries < 200 && out.length < want; tries++) {
    const x = b.x1 + 0.4 + r() * (b.x2 - b.x1 - 0.8);
    const z = b.z1 + 2 + r() * (b.z2 - b.z1 - 3.5);
    if (hole.walls.some((w) => inR(w, x, z)) || hole.water.some((w) => inR(w, x, z, 0.1))) continue;
    if (hole.bumpers.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 0.35)) continue;
    if (hole.spinners.some((s) => Math.abs(s.z - z) < 0.5)) continue;
    if (out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 0.8)) continue;
    out.push([x, z]);
  }
  return out;
}

export function loadCoins(): number {
  try { const n = Number(localStorage.getItem(WALLET_KEY)); return Number.isSafeInteger(n) && n > 0 ? n : 0; } catch { return 0; }
}
export function addCoins(n: number): number {
  const v = loadCoins() + n;
  try { localStorage.setItem(WALLET_KEY, String(v)); } catch { /* ignore */ }
  return v;
}
export function loadBought(): number[] {
  try { const a = JSON.parse(localStorage.getItem(BOUGHT_KEY) || "[]"); return Array.isArray(a) ? a.filter(Number.isInteger) : []; } catch { return []; }
}
/** Spend coins on a skin. Returns false if not affordable or not for sale. */
export function buySkin(s: Skin): boolean {
  const price = skinPrice(s), have = loadCoins();
  if (price === null || have < price) return false;
  try {
    localStorage.setItem(WALLET_KEY, String(have - price));
    localStorage.setItem(BOUGHT_KEY, JSON.stringify([...new Set([...loadBought(), s.id])]));
  } catch { return false; }
  return true;
}

/** Real-money coin packs (payment not connected yet). */
export const COIN_PACKS = [
  { coins: 500, usd: 0.74 },
  { coins: 1000, usd: 1.49 },
  { coins: 2800, usd: 2.99 },
  { coins: 5000, usd: 4.99 },
  { coins: 10000, usd: 9.99 },
  { coins: 20000, usd: 18.99 },
] as const;
