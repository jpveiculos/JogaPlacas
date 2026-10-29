import { describe, expect, it } from "vitest";
import { allocatePlateStake } from "./allocate-plate-stake";

describe("allocatePlateStake", () => {
  it("allocates R$1.00 with all four leftover cents assigned to unit", () => {
    expect(allocatePlateStake(100)).toEqual({
      unitCents: 20,
      tensCents: 16,
      hundredsCents: 16,
      thousandsCents: 16,
      lettersCents: 16,
      fullPlateCents: 16,
    });
  });

  it("preserves every cent and assigns the remainder only to unit", () => {
    for (let totalCents = 100; totalCents <= 1_000; totalCents += 1) {
      const allocation = allocatePlateStake(totalCents);
      expect(Object.values(allocation).reduce((sum, value) => sum + value, 0)).toBe(totalCents);
      const base = Math.floor(totalCents / 6);
      expect(allocation.unitCents).toBe(base + (totalCents % 6));
      expect([
        allocation.tensCents,
        allocation.hundredsCents,
        allocation.thousandsCents,
        allocation.lettersCents,
        allocation.fullPlateCents,
      ]).toEqual([base, base, base, base, base]);
    }
  });

  it.each([0, 99, 100.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid total %s", (totalCents) => {
    expect(() => allocatePlateStake(totalCents)).toThrow(/at least 100 cents/i);
  });
});
