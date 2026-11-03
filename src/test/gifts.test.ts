import { expect, test, beforeEach } from "vitest";
import { applyGift, skinNumberToId } from "@/game/gifts";
import { loadCoins, loadBought } from "@/game/coins";
import { isVip } from "@/game/vip";

beforeEach(() => localStorage.clear());
test("skin numbers 1-500 map to skins, others rejected", () => {
  expect(skinNumberToId(1)).toBe(0); expect(skinNumberToId(500)).toBe(499);
  expect(skinNumberToId(0)).toBeNull(); expect(skinNumberToId(501)).toBeNull();
});
test("gifted coins, VIP and skin land on the device", () => {
  applyGift("coins", 777); expect(loadCoins()).toBe(777);
  applyGift("vip", 0); expect(isVip()).toBe(true);
  applyGift("skin", 42); expect(loadBought()).toContain(41);
});
