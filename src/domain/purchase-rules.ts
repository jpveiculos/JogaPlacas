/**
 * Pure purchase invariants from docs/PRODUCT_SPEC.md.
 *
 * These helpers are deliberately independent of Prisma/HTTP/provider code so the
 * same rules can be exercised before wiring transactional persistence.
 */

export const MIN_PLATE_STAKE_CENTS = 100;
export const MIN_REPETITIONS = 1;
export const MAX_REPETITIONS = 10;

export type CategoryAllocation = {
  unitCents: number;
  tensCents: number;
  hundredsCents: number;
  thousandsCents: number;
  lettersCents: number;
  fullPlateCents: number;
};

export type ParticipationDraft = {
  roundId: string;
  cutoffAt: Date;
  startsAt?: Date;
  lines: Array<CategoryAllocation & { plateDisplay: string }>;
};

export type PurchaseDraft = {
  repetitions: number;
  paymentMethod: "PIX" | "WALLET" | "CASH";
  participations: ParticipationDraft[];
};

export class PurchaseRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseRuleError";
  }
}

function assertIntegerCents(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PurchaseRuleError(`${field} must be a non-negative integer number of cents`);
  }
}

export function lineStakeCents(allocation: CategoryAllocation): number {
  const values = [
    ["unitCents", allocation.unitCents],
    ["tensCents", allocation.tensCents],
    ["hundredsCents", allocation.hundredsCents],
    ["thousandsCents", allocation.thousandsCents],
    ["lettersCents", allocation.lettersCents],
    ["fullPlateCents", allocation.fullPlateCents],
  ] as const;

  for (const [field, value] of values) assertIntegerCents(value, field);
  const stake = values.reduce((total, [, value]) => total + value, 0);
  if (!Number.isSafeInteger(stake)) {
    throw new PurchaseRuleError("Plate stake exceeds the safe integer range");
  }
  return stake;
}

export function validatePurchaseDraft(
  purchase: PurchaseDraft,
  now: Date = new Date(),
): { totalCents: number; participationCount: number } {
  if (!Number.isInteger(purchase.repetitions)
    || purchase.repetitions < MIN_REPETITIONS
    || purchase.repetitions > MAX_REPETITIONS) {
    throw new PurchaseRuleError("Repetitions must be an integer between 1 and 10");
  }

  if (purchase.participations.length !== purchase.repetitions) {
    throw new PurchaseRuleError("There must be exactly one participation per repeated round");
  }

  const roundIds = new Set<string>();
  let totalCents = 0;

  for (const [index, participation] of purchase.participations.entries()) {
    if (!participation.roundId || roundIds.has(participation.roundId)) {
      throw new PurchaseRuleError("Each participation must reference a distinct round");
    }
    roundIds.add(participation.roundId);

    if (!(participation.cutoffAt instanceof Date)
      || Number.isNaN(participation.cutoffAt.getTime())) {
      throw new PurchaseRuleError("A valid round cutoff is required");
    }
    if (participation.startsAt && (!(participation.startsAt instanceof Date)
      || Number.isNaN(participation.startsAt.getTime()))) {
      throw new PurchaseRuleError("A valid round start is required when provided");
    }
    if (index === 0 && participation.startsAt && now.getTime() < participation.startsAt.getTime()) {
      throw new PurchaseRuleError("The first participation cannot be purchased before its round opens");
    }
    if (now.getTime() >= participation.cutoffAt.getTime()) {
      throw new PurchaseRuleError("A participation cannot be purchased at or after its round cutoff");
    }
    if (participation.lines.length === 0) {
      throw new PurchaseRuleError("Each round participation must contain at least one plate");
    }

    for (const line of participation.lines) {
      if (!line.plateDisplay.trim()) {
        throw new PurchaseRuleError("Plate display cannot be empty");
      }
      const stake = lineStakeCents(line);
      if (stake < MIN_PLATE_STAKE_CENTS) {
        throw new PurchaseRuleError("Each plate must total at least R$1.00 per round");
      }
      totalCents += stake;
      if (!Number.isSafeInteger(totalCents)) {
        throw new PurchaseRuleError("Purchase total exceeds the safe integer range");
      }
    }
  }

  return { totalCents, participationCount: purchase.participations.length };
}
