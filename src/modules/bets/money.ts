export type CategoryAllocation = {
  unitCents: number;
  tensCents: number;
  hundredsCents: number;
  thousandsCents: number;
  lettersCents: number;
  fullPlateCents: number;
};

const CATEGORY_KEYS = [
  "unitCents",
  "tensCents",
  "hundredsCents",
  "thousandsCents",
  "lettersCents",
  "fullPlateCents",
] as const;

/**
 * Splits a plate stake into six equal category shares using integer cents.
 * Any remainder cent is assigned from the lowest multiplier category upward,
 * ensuring that the shares sum exactly to the original stake.
 */
export function allocateStakeCents(totalCents: number): CategoryAllocation {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new Error("O valor deve ser um número inteiro de centavos não negativo.");
  }

  const base = Math.floor(totalCents / CATEGORY_KEYS.length);
  let remainder = totalCents % CATEGORY_KEYS.length;
  const values = CATEGORY_KEYS.map(() => base);

  for (let index = 0; remainder > 0; index += 1) {
    values[index] += 1;
    remainder -= 1;
  }

  return {
    unitCents: values[0],
    tensCents: values[1],
    hundredsCents: values[2],
    thousandsCents: values[3],
    lettersCents: values[4],
    fullPlateCents: values[5],
  };
}

export function sumAllocationCents(allocation: CategoryAllocation): number {
  return CATEGORY_KEYS.reduce((total, key) => total + allocation[key], 0);
}
