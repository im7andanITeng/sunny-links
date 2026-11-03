import { describe, it, expect } from "vitest";
import { isInappropriate } from "@/game/badwords";
describe("name tag filter", () => {
  it("catches cuss words", () => { expect(isInappropriate("you SHIT")).toBe(true); expect(isInappropriate("f.u.c.k")).toBe(true); });
  it("allows normal tags", () => { expect(isInappropriate("Golf King")).toBe(false); expect(isInappropriate("class pro")).toBe(false); });
});
