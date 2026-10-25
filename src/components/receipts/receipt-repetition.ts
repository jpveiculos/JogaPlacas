import type { ThermalReceiptPlate } from "./thermal-receipt-types";

/**
 * Assigns a stable sequence number to each distinct round in the supplied
 * participation order. Multiple plate lines in the same round share a number.
 */
export function getReceiptRepetitionNumbers(plates: ThermalReceiptPlate[]): number[] {
  const numbersByRound = new Map<string, number>();
  return plates.map((plate) => {
    const existing = numbersByRound.get(plate.roundCode);
    if (existing !== undefined) return existing;
    const next = numbersByRound.size + 1;
    numbersByRound.set(plate.roundCode, next);
    return next;
  });
}
