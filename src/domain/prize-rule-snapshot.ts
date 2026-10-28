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
  unit: 9,
  tens: 30,
  hundreds: 300,
  thousands: 3_000,
  letters: 3_000,
  fullPlate: 300_000,
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

/** Stable version identifier for the currently approved multipliers. */
export const CURRENT_PRIZE_RULE_VERSION = "approved-v3";

/** Build the server-owned snapshot stored with every new purchase line. */
export function createCurrentPrizeRuleSnapshot(): {
  version: string;
  multipliers: PrizeMultipliers;
} {
  return {
    version: CURRENT_PRIZE_RULE_VERSION,
    multipliers: { ...APPROVED_PRIZE_MULTIPLIERS },
  };
}
