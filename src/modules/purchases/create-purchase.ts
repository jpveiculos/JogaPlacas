import { Prisma, PrismaClient, PaymentMethod, RoundStatus } from "@prisma/client";
import { normalizePlate } from "../plates/normalize-plate";
import {
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
  now = new Date(),
) {
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
    throw new PurchaseServiceError("A valid idempotency key is required", "INVALID_IDEMPOTENCY_KEY");
  }
  if (!input.receiptCode.trim()) {
    throw new PurchaseServiceError("A receipt code is required", "INVALID_PURCHASE");
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

    const roundIds = input.participations.map((p) => p.roundId);
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
      totals = validatePurchaseDraft(draft, now);
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
      const serializationConflict = knownRequestError && error.code === "P2034";
      // A unique-key race can mean another request with the same idempotency
      // key committed first. Re-enter the transaction once to read and compare
      // that purchase; unrelated unique violations will still surface on retry.
      const uniqueConstraintRace =
        knownRequestError && error.code === "P2002" && attempt === 0;

      if ((serializationConflict && attempt < 3) || uniqueConstraintRace) {
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}
