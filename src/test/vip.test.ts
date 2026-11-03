import { expect, test } from "vitest";
import { packPrice, unlockAtFor, coinMultiplier, VIP_PRICE, isVip, setVip } from "@/game/vip";
import { SKINS } from "@/game/skins";

test("VIP costs $3.99", () => expect(VIP_PRICE).toBe(3.99));
test("VIP gets a skin every 3 levels instead of 5", () => {
  expect(unlockAtFor(SKINS[2]!, false)).toBe(10);
  expect(unlockAtFor(SKINS[2]!, true)).toBe(6);
});
test("VIP takes $1 off coin packs", () => {
  expect(packPrice(4.99, true)).toBe(3.99);
  expect(packPrice(18.99, true)).toBe(17.99);
  expect(packPrice(4.99, false)).toBe(4.99);
});
test("VIP doubles coins", () => expect(coinMultiplier(true)).toBe(2));
test("the admin panel's free VIP button turns VIP on and off", () => {
  setVip(false);
  expect(isVip()).toBe(false);
  setVip(true);
  expect(isVip()).toBe(true);
  setVip(false);
  expect(isVip()).toBe(false);
});
