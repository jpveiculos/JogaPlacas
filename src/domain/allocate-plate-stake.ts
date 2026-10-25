import type { CategoryAllocation } from "./purchase-rules";

/**
 * Split a plate's total stake evenly across the six prize categories using
 * integer cents. Any remainder belongs exclusively to the unit category.
 */
export function allocatePlateStake(totalCents: number): CategoryAllocation {
  if (!Number.isSafeInteger(totalCents) || totalCents < 100) {
    throw new Error("Plate stake must be a safe integer of at least 100 cents");
  }

  const baseCents = Math.floor(totalCents / 6);
  const remainderCents = totalCents % 6;

  return {
    unitCents: baseCents + remainderCents,
    tensCents: baseCents,
    hundredsCents: baseCents,
    thousandsCents: baseCents,
    lettersCents: baseCents,
    fullPlateCents: baseCents,
  };
}
