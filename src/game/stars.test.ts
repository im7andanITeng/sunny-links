import { describe, expect, it } from "vitest";
import { computeStars } from "./course";

describe("computeStars level rating", () => {
  it("gives 3 stars at par or better", () => {
    expect(computeStars(18, 18)).toBe(3);
    expect(computeStars(15, 18)).toBe(3);
  });

  it("gives 2 stars within 6 over par", () => {
    expect(computeStars(19, 18)).toBe(2);
    expect(computeStars(24, 18)).toBe(2);
  });

  it("gives 1 star within 12 over par", () => {
    expect(computeStars(25, 18)).toBe(1);
    expect(computeStars(30, 18)).toBe(1);
  });

  it("gives 0 stars more than 12 over par", () => {
    expect(computeStars(31, 18)).toBe(0);
    expect(computeStars(60, 18)).toBe(0);
  });
});
