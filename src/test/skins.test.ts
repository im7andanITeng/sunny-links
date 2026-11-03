import { expect, test } from "vitest";
import { ADMIN_SKIN_ID, getSkin, loadSkinId, saveSkinId } from "@/game/skins";

test("the admin signed ball stays selected after saving and loading", () => {
  saveSkinId(ADMIN_SKIN_ID);
  expect(loadSkinId()).toBe(ADMIN_SKIN_ID);
  expect(getSkin(loadSkinId()).name).toBe("Signed Ball");
});

test("a normal skin still loads", () => {
  saveSkinId(7);
  expect(loadSkinId()).toBe(7);
});

test("an unknown skin id falls back to the first ball", () => {
  saveSkinId(5000);
  expect(loadSkinId()).toBe(0);
});
