import { supabase } from "@/integrations/supabase/client";
import { addCoins, loadBought } from "./coins";
import { setVip } from "./vip";
import { dayKey, daysInMonth, markDone } from "./daily";
import { loadProgress, saveProgress, freshProgress } from "./progress";
import { getHole, HOLES_PER_LEVEL } from "./course";
import { ALL_SKINS_KEY } from "./admin";
import { TOTAL } from "./skins";

export type GiftKind = "coins" | "vip" | "daily" | "levels" | "skin" | "all_skins";

/** Skin number the admin types (1-500) → skin id (0-499). */
export const skinNumberToId = (n: number) => (Number.isInteger(n) && n >= 1 && n <= TOTAL ? n - 1 : null);

export async function sendGift(playerId: string, kind: GiftKind, amount = 0): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase.from("gifts").insert({ player_id: playerId, kind, amount, created_by: data.user?.id ?? null });
  return !error;
}

export function skipLevels(levels: number): number {
  const p = loadProgress();
  const cur = Math.floor(p.holeIdx / HOLES_PER_LEVEL);
  const next = (cur + levels) * HOLES_PER_LEVEL;
  const scores = [...p.scores.slice(0, next)];
  while (scores.length < next) scores.push(getHole(scores.length).par);
  saveProgress(freshProgress(next, scores));
  return cur + levels;
}

export function finishDailyMonth(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  for (let d = 1; d <= daysInMonth(y, m); d++) markDone(dayKey(y, m, d));
}

/** Applies one gift on this device. Returns a message, and new level count if levels changed. */
export function applyGift(kind: string, amount: number): { msg: string; levels?: number } | null {
  switch (kind) {
    case "coins": addCoins(amount); return { msg: `🪙 ${amount} coins` };
    case "vip": setVip(true); return { msg: "👑 VIP" };
    case "daily": finishDailyMonth(); return { msg: "📅 every Daily Level this month" };
    case "levels": return { msg: `⏭ ${amount} levels`, levels: skipLevels(amount) };
    case "skin": {
      const id = skinNumberToId(amount);
      if (id === null) return null;
      localStorage.setItem("sunny-links-bought", JSON.stringify([...new Set([...loadBought(), id])]));
      return { msg: `🎾 ball skin #${amount}` };
    }
    case "all_skins": localStorage.setItem(ALL_SKINS_KEY, "1"); return { msg: "🎁 every ball skin" };
  }
  return null;
}

export async function claimGifts(playerId: string) {
  const { data, error } = await supabase.rpc("claim_gifts", { _player: playerId });
  if (error || !data) return [];
  return data.map((g) => applyGift(g.kind, g.amount)).filter((x): x is NonNullable<typeof x> => !!x);
}
