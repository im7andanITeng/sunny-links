// VIP: $3.99 one-time (payment not connected yet). Stored on this device.
import type { Skin } from "./skins";

export const VIP_PRICE = 3.99;
export const VIP_LEVELS_PER_SKIN = 3;
export const VIP_COIN_DISCOUNT = 1;
export const VIP_MIN_PACK_PRICE = 0.49;
const KEY = "sunny-links-vip";

export function isVip(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setVip(v: boolean) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ } }

/** Levels needed for a skin: every 5 levels normally, every 3 with VIP. */
export function unlockAtFor(s: Skin, vip: boolean): number {
  return vip ? s.id * VIP_LEVELS_PER_SKIN : s.unlockAt;
}
export const ownsByLevel = (s: Skin, levels: number, vip: boolean) => levels >= unlockAtFor(s, vip);

/** Coin pack price: $1 off with VIP, never below $0.49. */
export function packPrice(usd: number, vip: boolean): number {
  if (!vip) return usd;
  return Math.max(VIP_MIN_PACK_PRICE, Math.round((usd - VIP_COIN_DISCOUNT) * 100) / 100);
}

/** VIP players get double coins from every coin on the course. */
export const coinMultiplier = (vip: boolean) => (vip ? 2 : 1);
