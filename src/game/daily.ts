import { generateHole, type Hole } from "./course";
import type { Skin } from "./skins";

const DONE_KEY = "sunny-links-daily-done";
const PRIZE_KEY = "sunny-links-daily-prizes";
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const dayKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const todayKey = (now = new Date()) => dayKey(now.getFullYear(), now.getMonth(), now.getDate());
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Last 3 days of a month get extra obstacles. */
export const isFinalDays = (key: string) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return d > daysInMonth(y, m - 1) - 3;
};

/** The same hard hole for everyone on a given day (generated far past normal difficulty). */
export function dailyHole(key: string): Hole {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hole = generateHole(60 + (h % 5000));
  if (!isFinalDays(key)) return { ...hole, name: `Daily · ${hole.name}` };
  const { x2: W, z2: L } = hole.bounds;
  const extra = Array.from({ length: 6 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return { x: 0.8 + ((h % 1000) / 1000) * (W - 1.6), z: 3 + ((i + 0.5) / 6) * (L - 5.5), r: 0.25 };
  });
  return { ...hole, par: hole.par + 1, bumpers: [...hole.bumpers, ...extra], name: `Daily 🔥 · ${hole.name}` };
}

const read = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full */ } };

export const loadDone = () => read(DONE_KEY);
/** Month is fully complete when every day in it has been played. */
export const monthComplete = (done: string[], y: number, m: number) =>
  Array.from({ length: daysInMonth(y, m) }, (_, i) => dayKey(y, m, i + 1)).every((k) => done.includes(k));

/** Marks today done; returns the limited skin id if this finished the whole month. */
export function markDone(key: string): number | null {
  const done = read(DONE_KEY);
  if (!done.includes(key)) { done.push(key); write(DONE_KEY, done); }
  const [y, mm] = key.split("-").map(Number) as [number, number];
  if (!monthComplete(done, y, mm - 1)) return null;
  const id = limitedId(y, mm - 1);
  const prizes = read(PRIZE_KEY);
  if (!prizes.includes(String(id))) { prizes.push(String(id)); write(PRIZE_KEY, prizes); }
  return id;
}
export const loadPrizes = () => read(PRIZE_KEY).map(Number);

/** Limited skins live at ids 10000+ so they never clash with the 500 normal ones. */
export const LIMITED_BASE = 10000;
export const limitedId = (y: number, m: number) => LIMITED_BASE + y * 12 + m;
const LIMITED_COLORS = ["#7fdbff", "#ff4f81", "#3ddc97", "#ffd23f", "#b388ff", "#ff9f1c", "#00c2a8", "#ff6b6b", "#c77dff", "#ff7b00", "#9c6644", "#e63946"];
export function limitedSkin(id: number): Skin {
  const n = id - LIMITED_BASE, y = Math.floor(n / 12), m = n % 12;
  return { id, name: `${MONTHS[m]} ${y} Limited`, pattern: "limited", a: LIMITED_COLORS[m]!, b: "#ffd700", emissive: "#332200", metalness: 0.6, roughness: 0.2, unlockAt: Infinity };
}
