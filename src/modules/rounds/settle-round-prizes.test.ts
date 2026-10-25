import { describe, expect, it } from "vitest";
import { calculateLinePrizeCents, type SettlementLine } from "./settle-round-prizes";

const base = (overrides: Partial<SettlementLine> = {}): SettlementLine => ({
  plateFormat: "LEGACY", normalizedPlate: "ABC1234",
  unitCents: 100, tensCents: 100, hundredsCents: 100, thousandsCents: 100,
  lettersCents: 100, fullPlateCents: 100,
  ruleVersion: "test-v1",
  ruleSnapshot: { version: "test-v1", multipliers: { unit: 2, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 } },
  ...overrides,
});

describe("calculateLinePrizeCents", () => {
  it("uses only the legacy result for a legacy bet", () => {
    expect(calculateLinePrizeCents(base(), "ABC-1234", "XYZ9K99")).toBe(100 * (2 + 20 + 200 + 2_000 + 2_000 + 200_000));
    expect(calculateLinePrizeCents(base(), "XYZ-9999", "ABC1A34")).toBe(0);
  });

  it("preserves the Mercosur letter literally in the four-character suffix", () => {
    const line = base({ plateFormat: "MERCOSUR", normalizedPlate: "ABC1K23" });
    expect(calculateLinePrizeCents(line, "ABC-1234", "ABC1K23")).toBe(100 * (2 + 20 + 200 + 2_000 + 2_000 + 200_000));
    // K and J are not interchangeable. Only the shared unit, tens and first-three-letter categories win.
    expect(calculateLinePrizeCents(line, "ABC-1234", "ABC1J23")).toBe(202_200);
  });

  it("adds category wins using integer cents for a Mercosur bet", () => {
    const line = base({
      plateFormat: "MERCOSUR", normalizedPlate: "ZZZ1K23",
      unitCents: 0, tensCents: 100, hundredsCents: 0, thousandsCents: 0,
      lettersCents: 0, fullPlateCents: 0,
    });
    expect(calculateLinePrizeCents(line, "AAA-0000", "ABC1K23")).toBe(2_000);
  });

  it("pays R$1.20 for the approved 20-cent unit allocation at 6x", () => {
    const line = base({
      unitCents: 20, tensCents: 16, hundredsCents: 16, thousandsCents: 16,
      lettersCents: 16, fullPlateCents: 16,
      ruleSnapshot: {
        version: "approved-v2",
        multipliers: { unit: 6, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 },
      },
      ruleVersion: "approved-v2",
    });
    expect(calculateLinePrizeCents(line, "XYZ-9876", "ABC1K99")).toBe(120);
  });

  it("uses the multiplier snapshot stored with the bet, not the current default", () => {
    const line = base({
      unitCents: 100, tensCents: 0, hundredsCents: 0, thousandsCents: 0, lettersCents: 0, fullPlateCents: 0,
      ruleSnapshot: { version: "test-v1", multipliers: { unit: 7, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 } },
    });
    expect(calculateLinePrizeCents(line, "ABC-1234", "XYZ9K99")).toBe(700);
  });

  it("rejects a missing or mismatched historical multiplier snapshot", () => {
    expect(() => calculateLinePrizeCents(base({ ruleSnapshot: { version: "old-v1" } }), "ABC-1234", "XYZ9K99"))
      .toThrowError("Stored rule snapshot is missing valid historical multipliers");
  });

  it("rejects malformed stored results", () => {
    expect(() => calculateLinePrizeCents(base(), "ABC1K23", "ABC1K23"))
      .toThrowError("Result does not match its plate format");
  });

  it("rejects a bet whose stored plate does not match its declared format", () => {
    expect(() => calculateLinePrizeCents(base({ plateFormat: "MERCOSUR", normalizedPlate: "ABC1234" }), "ABC-1234", "ABC1K23"))
      .toThrowError("Stored bet does not match its declared plate format");
  });

  it("rejects prizes outside the database integer range", () => {
    expect(() => calculateLinePrizeCents(base({ fullPlateCents: 2_147_483_647 }), "ABC-1234", "ABC1K23"))
      .toThrowError("Prize exceeds the database integer range");
  });
});
