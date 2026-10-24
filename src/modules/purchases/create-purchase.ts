import { Prisma, PaymentMethod, RoundStatus, type PrismaClient } from "../../generated/prisma/client";
import { normalizePlate } from "../plates/normalize-plate";
import {
  MAX_REPETITIONS,
  MIN_REPETITIONS,
  validatePurchaseDraft,
  type CategoryAllocation,
  type PurchaseDraft,
} from "../../domain/purchase-rules";

export type PixPurchaseInput = {
  idempotencyKey: string;
  receiptCode: string;
  playerId?: string;
  cashierId?: string;
  customerId?: string;
  repetitions: number;
  participations: Array<{
    roundId: string;
    lines: Array<CategoryAllocation & {
      plateDisplay: string;
      ruleVersion: string;
      ruleSnapshot: Prisma.InputJsonValue;
    }>;
  }>;
};

export class PurchaseServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_ACTOR"
      | "INVALID_IDEMPOTENCY_KEY"
      | "IDEMPOTENCY_CONFLICT"
      | "ROUND_UNAVAILABLE"
      | "INVALID_PURCHASE",
  ) {
    super(message);
    this.name = "PurchaseServiceError";
  }
}

/**
 * Persist a pending Pix checkout and its per-round participations atomically.
 * This function does not call Mercado Pago and never marks a payment as paid.
 * The provider adapter must create the external charge after this transaction,
 * using the persisted payment idempotency key, and reconcile failures safely.
 */
export async function createPendingPixPurchase(
  prisma: PrismaClient,
  input: PixPurchaseInput,
  decisionTimeOverride?: Date,
) {
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
    throw new PurchaseServiceError("A valid idempotency key is required", "INVALID_IDEMPOTENCY_KEY");
  }
  if (!input.receiptCode.trim()) {
    throw new PurchaseServiceError("A receipt code is required", "INVALID_PURCHASE");
  }
  if (!Number.isInteger(input.repetitions)
    || input.repetitions < MIN_REPETITIONS
    || input.repetitions > MAX_REPETITIONS) {
    throw new PurchaseServiceError("Repetitions must be an integer between 1 and 10", "INVALID_PURCHASE");
  }
  if (input.participations.length !== input.repetitions) {
    throw new PurchaseServiceError("There must be exactly one participation per repeated round", "INVALID_PURCHASE");
  }
  if (new Set(input.participations.map((item) => item.roundId)).size !== input.participations.length) {
    throw new PurchaseServiceError("Each participation must reference a distinct round", "INVALID_PURCHASE");
  }
  if (Boolean(input.playerId) === Boolean(input.cashierId)) {
    throw new PurchaseServiceError("Exactly one player or cashier must own the purchase", "INVALID_ACTOR");
  }
  if (input.cashierId && !input.customerId) {
    throw new PurchaseServiceError("Cashier purchases require a customer record", "INVALID_ACTOR");
  }
  // Validate plate syntax before opening a database transaction. Invalid user input
  // should not reach persistence or surface as an unclassified Zod exception.
  try {
    for (const participation of input.participations) {
      if (!participation.lines.length) {
        throw new PurchaseServiceError("Each round participation must contain at least one plate", "INVALID_PURCHASE");
      }
      for (const line of participation.lines) normalizePlate(line.plateDisplay);
    }
  } catch (error) {
    if (error instanceof PurchaseServiceError) throw error;
    throw new PurchaseServiceError(
      error instanceof Error ? error.message : "Invalid plate format",
      "INVALID_PURCHASE",
    );
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
    const existing = await tx.purchase.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { participations: { include: { lines: true } }, payment: true },
    });
    if (existing) {
      const incomingByRound = new Map(input.participations.map((participation) => [
        participation.roundId,
        participation.lines.map((line) => {
          const normalized = normalizePlate(line.plateDisplay);
          return [
            normalized.format,
            normalized.normalized,
            line.unitCents,
            line.tensCents,
            line.hundredsCents,
            line.thousandsCents,
            line.lettersCents,
            line.fullPlateCents,
            line.ruleVersion,
            JSON.stringify(line.ruleSnapshot),
          ].join("|");
        }).sort().join("\\n"),
      ]));
      const existingByRound = new Map(existing.participations.map((participation) => [
        participation.roundId,
        participation.lines.map((line) => [
          String(line.plateFormat).toLowerCase(),
          line.normalizedPlate,
          line.unitCents,
          line.tensCents,
          line.hundredsCents,
          line.thousandsCents,
          line.lettersCents,
          line.fullPlateCents,
          line.ruleVersion,
          JSON.stringify(line.ruleSnapshot),
        ].join("|")).sort().join("\\n"),
      ]));
      const sameRequest =
        existing.paymentMethod === PaymentMethod.PIX &&
        existing.receiptCode === input.receiptCode &&
        existing.playerId === (input.playerId ?? null) &&
        existing.cashierId === (input.cashierId ?? null) &&
        existing.customerId === (input.customerId ?? null) &&
        existing.participations.length === input.repetitions &&
        existingByRound.size === incomingByRound.size &&
        [...incomingByRound].every(([roundId, lines]) => existingByRound.get(roundId) === lines);
      if (!sameRequest) {
        throw new PurchaseServiceError(
          "The idempotency key was already used for a different purchase",
          "IDEMPOTENCY_CONFLICT",
        );
      }
      return existing;
    }

    const roundIds = input.participations.map((p) => p.roundId).sort();

    // Purchases and round closure must acquire this same row lock before
    // deciding whether the round accepts entries. Sorted IDs avoid lock-order
    // inversions for purchases that span more than one round.
    await tx.$queryRaw`
      SELECT "id" FROM "Round"
      WHERE "id" IN (${Prisma.join(roundIds)})
      ORDER BY "id"
      FOR UPDATE
    `;

    // Use PostgreSQL wall-clock time after acquiring the lock. Transaction
    // start time or a timestamp captured before waiting could be stale at cutoff.
    const decisionTime = decisionTimeOverride ?? (
      await tx.$queryRaw<Array<{ decisionTime: Date }>>`
        SELECT clock_timestamp() AS "decisionTime"
      `
    )[0]!.decisionTime;

    const rounds = await tx.round.findMany({ where: { id: { in: roundIds } } });
    const roundsById = new Map(rounds.map((round) => [round.id, round]));

    const draft: PurchaseDraft = {
      repetitions: input.repetitions,
      paymentMethod: "PIX",
      participations: input.participations.map((participation) => {
        const round = roundsById.get(participation.roundId);
        if (!round || (round.status !== RoundStatus.SCHEDULED && round.status !== RoundStatus.OPEN)) {
          throw new PurchaseServiceError("A selected round is not available", "ROUND_UNAVAILABLE");
        }
        return {
          roundId: round.id,
          cutoffAt: round.cutoffAt,
          lines: participation.lines.map((line) => ({
            plateDisplay: line.plateDisplay,
            unitCents: line.unitCents,
            tensCents: line.tensCents,
            hundredsCents: line.hundredsCents,
            thousandsCents: line.thousandsCents,
            lettersCents: line.lettersCents,
            fullPlateCents: line.fullPlateCents,
          })),
        };
      }),
    };

    let totals: ReturnType<typeof validatePurchaseDraft>;
    try {
      totals = validatePurchaseDraft(draft, decisionTime);
    } catch (error) {
      throw new PurchaseServiceError(
        error instanceof Error ? error.message : "Invalid purchase",
        "INVALID_PURCHASE",
      );
    }

    if (totals.totalCents > 2_147_483_647) {
      throw new PurchaseServiceError("Purchase total exceeds the database integer limit", "INVALID_PURCHASE");
    }

    const totalByRound = new Map<string, number>();
    for (const participation of draft.participations) {
      const total = participation.lines.reduce(
        (sum, line) => sum + line.unitCents + line.tensCents + line.hundredsCents
          + line.thousandsCents + line.lettersCents + line.fullPlateCents,
        0,
      );
      totalByRound.set(participation.roundId, total);
    }

    return tx.purchase.create({
      data: {
        playerId: input.playerId ?? null,
        cashierId: input.cashierId ?? null,
        customerId: input.customerId ?? null,
        status: "PENDING_PAYMENT",
        paymentMethod: PaymentMethod.PIX,
        totalCents: totals.totalCents,
        currency: "BRL",
        receiptCode: input.receiptCode,
        idempotencyKey: input.idempotencyKey,
        participations: {
          create: input.participations.map((participation) => ({
            roundId: participation.roundId,
            status: "PENDING",
            totalCents: totalByRound.get(participation.roundId)!,
            lines: {
              create: participation.lines.map((line) => {
                const normalized = normalizePlate(line.plateDisplay);
                return {
                  plateFormat: normalized.format === "legacy" ? "LEGACY" : "MERCOSUR",
                  plateDisplay: normalized.display,
                  normalizedPlate: normalized.normalized,
                  unitCents: line.unitCents,
                  tensCents: line.tensCents,
                  hundredsCents: line.hundredsCents,
                  thousandsCents: line.thousandsCents,
                  lettersCents: line.lettersCents,
                  fullPlateCents: line.fullPlateCents,
                  ruleVersion: line.ruleVersion,
                  ruleSnapshot: line.ruleSnapshot,
                };
              }),
            },
          })),
        },
        payment: {
          create: {
            provider: "MERCADO_PAGO",
            status: "PENDING",
            amountCents: totals.totalCents,
            idempotencyKey: `pix-payment:${input.idempotencyKey}`,
          },
        },
      },
      include: { participations: { include: { lines: true } }, payment: true },
    });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const knownRequestError =
        error instanceof Prisma.PrismaClientKnownRequestError;
      const serializationConflict =
        knownRequestError &&
        (
          error.code === "P2034" ||
          // PostgreSQL errors raised by raw SELECT ... FOR UPDATE can be
          // wrapped as P2010; SQLSTATE 40001 is serialization_failure.
          (error.code === "P2010" &&
            (error.meta?.code === "40001" ||
              String(error.message).toLowerCase().includes("could not serialize access")))
        );
      // A unique-key race can mean another request with the same idempotency
      // key committed first. Re-enter the transaction once to read and compare
      // that purchase; unrelated unique violations will still surface on retry.
      const uniqueTarget = knownRequestError ? error.meta?.target : undefined;
      const idempotencyUniqueRace =
        knownRequestError &&
        error.code === "P2002" &&
        attempt === 0 &&
        (
          (Array.isArray(uniqueTarget) && uniqueTarget.includes("idempotencyKey")) ||
          (typeof uniqueTarget === "string" && uniqueTarget.toLowerCase().includes("idempotencykey"))
        );

      if ((serializationConflict && attempt < 3) || idempotencyUniqueRace) {
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}
