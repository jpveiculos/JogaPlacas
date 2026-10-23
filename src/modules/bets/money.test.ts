import { describe, expect, it } from "vitest";
import { allocateStakeCents, sumAllocationCents } from "./money";

describe("allocateStakeCents", () => {
  it("conserves the original amount exactly", () => {
    for (let cents = 0; cents <= 500; cents += 1) {
      const allocation = allocateStakeCents(cents);
      expect(sumAllocationCents(allocation)).toBe(cents);
    }
  });

  it("assigns residual cents to lower multiplier categories first", () => {
    expect(allocateStakeCents(10)).toEqual({
      unitCents: 2,
      tensCents: 2,
      hundredsCents: 2,
      thousandsCents: 2,
      lettersCents: 1,
      fullPlateCents: 1,
    });
  });

  it("rejects negative, fractional and unsafe values", () => {
    expect(() => allocateStakeCents(-1)).toThrow();
    expect(() => allocateStakeCents(1.5)).toThrow();
    expect(() => allocateStakeCents(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
