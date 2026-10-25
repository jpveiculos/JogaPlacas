import { describe, expect, it } from "vitest";
import { getReceiptRepetitionNumbers, type ThermalReceiptPlate } from "./thermal-receipt";

const line = (roundCode: string, plateDisplay = "ABC-1234"): ThermalReceiptPlate => ({
  roundCode,
  plateDisplay,
  plateFormat: "LEGACY",
  stakeCents: 100,
});

describe("getReceiptRepetitionNumbers", () => {
  it("assigns one sequential number per distinct round while keeping multiple lines together", () => {
    expect(getReceiptRepetitionNumbers([
      line("JP-20261025-1230"),
      line("JP-20261025-1230", "XYZ-9876"),
      line("JP-20261025-1300"),
      line("JP-20261025-1330"),
      line("JP-20261025-1400"),
    ])).toEqual([1, 1, 2, 3, 4]);
  });

  it("supports ten consecutive repetitions in supplied order without skipping numbers", () => {
    const plates = Array.from({ length: 10 }, (_, index) =>
      line("JP-ROUND-" + String(index + 1).padStart(2, "0")),
    );
    expect(getReceiptRepetitionNumbers(plates)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("returns an empty sequence for an empty receipt", () => {
    expect(getReceiptRepetitionNumbers([])).toEqual([]);
  });
});
