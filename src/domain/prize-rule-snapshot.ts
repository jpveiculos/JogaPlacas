export const PRIZE_CATEGORIES = [
  "unit",
  "tens",
  "hundreds",
  "thousands",
  "letters",
  "fullPlate",
] as const;

export type PrizeCategory = (typeof PRIZE_CATEGORIES)[number];
export type PrizeMultipliers = Record<PrizeCategory, number>;

export const APPROVED_PRIZE_MULTIPLIERS: PrizeMultipliers = {
  unit: 2,
  tens: 20,
  hundreds: 200,
  thousands: 2_000,
  letters: 2_000,
  fullPlate: 200_000,
};

/**
 * A persisted rule snapshot must contain the multipliers that applied when the
 * line was purchased. Invalid/missing historical data must fail closed rather
 * than silently use the current configuration.
 */
export function readPrizeMultipliers(ruleVersion: string, snapshot: unknown): PrizeMultipliers | null {
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const value = snapshot as Record<string, unknown>;
  if (typeof value.version !== "string" || value.version !== ruleVersion) return null;
  const raw = value.multipliers;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;

  const multipliers = raw as Record<string, unknown>;
  const parsed = {} as PrizeMultipliers;
  for (const category of PRIZE_CATEGORIES) {
    const multiplier = multipliers[category];
    if (!Number.isSafeInteger(multiplier) || (multiplier as number) < 0) return null;
    parsed[category] = multiplier as number;
  }
  return parsed;
}
