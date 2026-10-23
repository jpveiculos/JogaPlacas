import { describe, expect, it } from "vitest";
import {
  PurchaseRuleError,
  validatePurchaseDraft,
  type CategoryAllocation,
  type PurchaseDraft,
} from "./purchase-rules";

const allocation = (unitCents: number): CategoryAllocation => ({
  unitCents,
  tensCents: 0,
  hundredsCents: 0,
  thousandsCents: 0,
  lettersCents: 0,
  fullPlateCents: 0,
});

const makePurchase = (repetitions: number, now = new Date("2026-10-23T20:00:00.000Z")): PurchaseDraft => ({
  repetitions,
  paymentMethod: "PIX",
  participations: Array.from({ length: repetitions }, (_, index) => ({
    roundId: `round-${index + 1}`,
    cutoffAt: new Date(now.getTime() + 60_000),
    lines: [{ plateDisplay: "ABC-1234", ...allocation(100) }],
  })),
});

describe("validatePurchaseDraft", () => {
  it("accepts one round and totals in integer cents", () => {
    expect(validatePurchaseDraft(makePurchase(1), new Date("2026-10-23T20:00:00.000Z")))
      .toEqual({ totalCents: 100, participationCount: 1 });
  });

  it("accepts ten rounds as ten participations under one purchase", () => {
    expect(validatePurchaseDraft(makePurchase(10), new Date("2026-10-23T20:00:00.000Z")))
      .toEqual({ totalCents: 1000, participationCount: 10 });
  });

  it.each([0, 11, 1.5])("rejects invalid repetition count %s", (repetitions) => {
    expect(() => validatePurchaseDraft(makePurchase(repetitions), new Date("2026-10-23T20:00:00.000Z")))
      .toThrow(PurchaseRuleError);
  });

  it("rejects a participation at the exact cutoff", () => {
    const now = new Date("2026-10-23T20:00:00.000Z");
    const purchase = makePurchase(1, now);
    purchase.participations[0].cutoffAt = now;
    expect(() => validatePurchaseDraft(purchase, now)).toThrow(/cutoff/i);
  });

  it("rejects duplicate round participation", () => {
    const purchase = makePurchase(2);
    purchase.participations[1].roundId = purchase.participations[0].roundId;
    expect(() => validatePurchaseDraft(purchase, new Date("2026-10-23T20:00:00.000Z")))
      .toThrow(/distinct round/i);
  });

  it("rejects a plate under R$1.00 per round", () => {
    const purchase = makePurchase(1);
    purchase.participations[0].lines[0] = {
      plateDisplay: "ABC-1234",
      ...allocation(99),
    };
    expect(() => validatePurchaseDraft(purchase, new Date("2026-10-23T20:00:00.000Z")))
      .toThrow(/R\$1\.00/i);
  });

  it("rejects negative or fractional category cents", () => {
    const purchase = makePurchase(1);
    purchase.participations[0].lines[0] = {
      plateDisplay: "ABC-1234",
      ...allocation(100),
      tensCents: -1,
    };
    expect(() => validatePurchaseDraft(purchase, new Date("2026-10-23T20:00:00.000Z")))
      .toThrow(/non-negative integer/i);
  });

  it("rejects mismatched repetition and participation count", () => {
    const purchase = makePurchase(2);
    purchase.participations.pop();
    expect(() => validatePurchaseDraft(purchase, new Date("2026-10-23T20:00:00.000Z")))
      .toThrow(/exactly one participation/i);
  });
});
