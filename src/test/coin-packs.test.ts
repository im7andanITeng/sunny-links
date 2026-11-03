import { expect, test } from "vitest";
import { COIN_PACKS } from "@/game/coins";
test("coin pack prices", () => {
  expect(COIN_PACKS.map((p) => [p.coins, p.usd])).toEqual([[500,0.74],[1000,1.49],[2800,2.99],[5000,4.99],[10000,9.99],[20000,18.99]]);
});
