import { randomBytes } from "node:crypto";
import { Prisma, PaymentMethod, RoundStatus, type PrismaClient } from "../../generated/prisma/client";
import { calculateCommissionCents } from "../../domain/cashier-commission";
import { normalizePlate } from "../plates/normalize-plate";
import { APPROVED_PRIZE_MULTIPLIERS, PRIZE_CATEGORIES, readPrizeMultipliers } from "../../domain/prize-rule-snapshot";
import { allocatePlateStake } from "../../domain/allocate-plate-stake";
import {
  MAX_REPETITIONS,
  MIN_REPETITIONS,
  validatePurchaseDraft,
  type PurchaseDraft,
} from "../../domain/purchase-rules";

export type PixPurchaseInput = {
  idempotencyKey: string;
  receiptCode?: string | null;
  playerId?: string;
  cashierId?: string;
  customerId?: string;
  paymentMethod?: "PIX" | "WALLET" | "CASH";
  repetitions: number;
  participations: Array<{
    roundId: string;
    lines: Array<{
      plateDisplay: string;
      stakeCents: number;
      ruleVersion: string;
      ruleSnapshot: Prisma.InputJsonValue;
    }>;
  }>;
};

function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`).join(",")}}`;
}

export class PurchaseServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_ACTOR"
      | "INVALID_IDEMPOTENCY_KEY"
      | "IDEMPOTENCY_CONFLICT"
      | "ROUND_UNAVAILABLE"
      | "INVALID_PURCHASE"
      | "INSUFFICIENT_BALANCE",
  ) {
    super(message);
    this.name = "PurchaseServiceError";
  }
}

/**
 * Persist a purchase and its per-round participations atomically.
 * Pix purchases remain pending until the payment provider confirms them.
 * Cash purchases are confirmed inside this transaction and receive an official
 * receipt code, cashier commission, and audit event. This function never calls
 * Mercado Pago; the Pix provider adapter creates its charge after this transaction.
 */
export async function createPurchase(
  prisma: PrismaClient,
  input: PixPurchaseInput,
  decisionTimeOverride?: Date,
) {
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
    throw new PurchaseServiceError("A valid idempotency key is required", "INVALID_IDEMPOTENCY_KEY");
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
  const paymentMethod = input.paymentMethod === "CASH" ? PaymentMethod.CASH : input.paymentMethod === "WALLET" ? PaymentMethod.WALLET : PaymentMethod.PIX;
  if (paymentMethod === PaymentMethod.CASH && (!input.cashierId || input.playerId)) {
    throw new PurchaseServiceError("Cash sales must be created by an authenticated cashier", "INVALID_ACTOR");
  }
  if (paymentMethod === PaymentMethod.WALLET && (!input.playerId || input.cashierId)) {
    throw new PurchaseServiceError("Wallet purchases must belong to the authenticated player", "INVALID_ACTOR");
  }
  if (Boolean(input.playerId) === Boolean(input.cashierId)) {
    throw new PurchaseServiceError("Exactly one player or cashier must own the purchase", "INVALID_ACTOR");
  }
  // Validate plate syntax before opening a database transaction. Invalid user input
  // should not reach persistence or surface as an unclassified Zod exception.
  try {
    for (const participation of input.participations) {
      if (!participation.lines.length) {
        throw new PurchaseServiceError("Each round participation must contain at least one plate", "INVALID_PURCHASE");
      }
      for (const line of participation.lines) {
        normalizePlate(line.plateDisplay);
        allocatePlateStake(line.stakeCents);
        if (!readPrizeMultipliers(line.ruleVersion, line.ruleSnapshot)) {
          throw new PurchaseServiceError(
            "Each line must include a valid multiplier snapshot matching its rule version",
            "INVALID_PURCHASE",
          );
        }
      }
    }
  } catch (error) {
    // Reusing a previously committed idempotency key with a malformed or
    // changed payload is a conflict, not a new invalid purchase. This lookup
    // is advisory; the transaction below remains authoritative for races.
    const purchaseDelegate = (prisma as PrismaClient & {
      purchase?: { findUnique: (args: { where: { idempotencyKey: string }; select: { id: true } }) => Promise<{ id: string } | null> };
    }).purchase;
    if (purchaseDelegate) {
      const existing = await purchaseDelegate.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        throw new PurchaseServiceError(
          "The idempotency key was already used for a different purchase",
          "IDEMPOTENCY_CONFLICT",
        );
      }
    }
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
      const incomingParticipations = input.participations.map((participation) =>
        participation.lines.map((line) => {
          const normalized = normalizePlate(line.plateDisplay);
          return [
            normalized.format,
            normalized.normalized,
            line.stakeCents,
            line.ruleVersion,
            stableJsonStringify(line.ruleSnapshot),
          ].join("|");
        }).sort().join("\\n"),
      ).sort();
      const existingParticipations = existing.participations.map((participation) =>
        participation.lines.map((line) => [
          String(line.plateFormat).toLowerCase(),
          line.normalizedPlate,
          line.unitCents + line.tensCents + line.hundredsCents
            + line.thousandsCents + line.lettersCents + line.fullPlateCents,
          line.ruleVersion,
          stableJsonStringify(line.ruleSnapshot),
        ].join("|")).sort().join("\\n"),
      ).sort();
      const sameRequest =
        existing.paymentMethod === paymentMethod &&
        (paymentMethod === PaymentMethod.CASH ? Boolean(existing.receiptCode) : existing.receiptCode === (input.receiptCode ?? null)) &&
        existing.playerId === (input.playerId ?? null) &&
        existing.cashierId === (input.cashierId ?? null) &&
        existing.customerId === (input.customerId ?? null) &&
        existing.participations.length === input.repetitions &&
        existingParticipations.length === incomingParticipations.length &&
        existingParticipations.every((lines, index) => lines === incomingParticipations[index]);
      if (!sameRequest) {
        throw new PurchaseServiceError(
          "The idempotency key was already used for a different purchase",
          "IDEMPOTENCY_CONFLICT",
        );
      }
      return existing;
    }

    // Existing idempotent purchases are handled above using their original snapshot.
    // A genuinely new purchase must use the currently approved server-side multipliers.
    for (const participation of input.participations) {
      for (const line of participation.lines) {
        const multipliers = readPrizeMultipliers(line.ruleVersion, line.ruleSnapshot);
        if (!multipliers || !PRIZE_CATEGORIES.every(
          (category) => multipliers[category] === APPROVED_PRIZE_MULTIPLIERS[category],
        )) {
          throw new PurchaseServiceError(
            "New purchases must use the currently approved prize multipliers",
            "INVALID_PURCHASE",
          );
        }
      }
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

    // The client sends the next available rows only as provisional placeholders.
    // A canceled/missing slot may be skipped: the actual participation sequence is
    // resolved again from eligible rounds at the payment-confirmation instant.
    for (let index = 1; index < selectedRounds.length; index += 1) {
      if (selectedRounds[index]!.resultAt.getTime() <= selectedRounds[index - 1]!.resultAt.getTime()) {
        throw new PurchaseServiceError("Upcoming rounds must be ordered by result time", "INVALID_PURCHASE");
      }
    }

    const draft: PurchaseDraft = {
      repetitions: input.repetitions,
      paymentMethod: paymentMethod === PaymentMethod.CASH ? "CASH" : "PIX",
      participations: input.participations.map((participation) => {
        const round = roundsById.get(participation.roundId);
        if (!round || (round.status !== RoundStatus.SCHEDULED && round.status !== RoundStatus.OPEN)) {
          throw new PurchaseServiceError("A selected round is not available", "ROUND_UNAVAILABLE");
        }
        return {
          roundId: round.id,
          // Do not bind the purchase to the round's start time. A scheduled
          // round can be the next valid target when the current cutoff has passed.
          cutoffAt: round.cutoffAt,
          lines: participation.lines.map((line) => ({
            plateDisplay: line.plateDisplay,
            ...allocatePlateStake(line.stakeCents),
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

    const isCash = paymentMethod === PaymentMethod.CASH;
    const isWallet = paymentMethod === PaymentMethod.WALLET;
    const isConfirmed = isCash || isWallet;
    if (isWallet && input.playerId) {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.playerId} FOR UPDATE`;
      const ledger = await tx.ledgerEntry.aggregate({ where: { userId: input.playerId }, _sum: { amountCents: true } });
      const availableCents = ledger._sum.amountCents ?? 0;
      if (availableCents < totals.totalCents) {
        throw new PurchaseServiceError(`Saldo insuficiente. Disponível: R$ ${(availableCents / 100).toFixed(2).replace(".", ",")}; total da aposta: R$ ${(totals.totalCents / 100).toFixed(2).replace(".", ",")}.`, "INSUFFICIENT_BALANCE");
      }
    }
    const receiptCode = isConfirmed ? `JP-${randomBytes(8).toString("hex").toUpperCase()}` : (input.receiptCode ?? null);
    const created = await tx.purchase.create({
      data: {
        playerId: input.playerId ?? null,
        cashierId: input.cashierId ?? null,
        customerId: input.customerId ?? null,
        status: isConfirmed ? "CONFIRMED" : "PENDING_PAYMENT",
        paymentMethod,
        totalCents: totals.totalCents,
        currency: "BRL",
        receiptCode,
        confirmedAt: isConfirmed ? decisionTime : null,
        idempotencyKey: input.idempotencyKey,
        participations: {
          create: input.participations.map((participation) => ({
            roundId: participation.roundId,
            status: isConfirmed ? "CONFIRMED" : "PENDING",
            totalCents: totalByRound.get(participation.roundId)!,
            ...(isConfirmed ? { confirmedAt: decisionTime } : {}),
            lines: {
              create: participation.lines.map((line) => {
                const normalized = normalizePlate(line.plateDisplay);
                const allocation = allocatePlateStake(line.stakeCents);
                return {
                  plateFormat: normalized.format === "legacy" ? "LEGACY" : "MERCOSUR",
                  plateDisplay: normalized.display,
                  normalizedPlate: normalized.normalized,
                  ...allocation,
                  ruleVersion: line.ruleVersion,
                  ruleSnapshot: line.ruleSnapshot,
                };
              }),
            },
          })),
        },
        ...(!isCash && !isWallet ? { payment: { create: {
          provider: "MERCADO_PAGO",
          status: "PENDING",
          amountCents: totals.totalCents,
          idempotencyKey: `pix-payment:${input.idempotencyKey}`,
        } } } : {}),
      },
      include: { participations: { include: { lines: true } }, payment: true },
    });
    if (isWallet && input.playerId) {
      await tx.ledgerEntry.create({ data: { userId: input.playerId, purchaseId: created.id, type: "PURCHASE_DEBIT", amountCents: -totals.totalCents, currency: "BRL", idempotencyKey: `purchase-debit:${created.id}`, description: `Pagamento de aposta com saldo da conta ${created.id}` } });
      await tx.auditEvent.create({ data: { actorId: input.playerId, action: "WALLET_PURCHASE_CONFIRMED", entityType: "Purchase", entityId: created.id, metadata: { receiptCode, totalCents: totals.totalCents, paymentMethod: "WALLET" } } });
    }
    if (isCash && input.cashierId) {
      const cashier = await tx.user.findFirst({
        where: { id: input.cashierId, role: "CASHIER", status: "ACTIVE" },
        select: { commissionRateBasisPoints: true },
      });
      if (!cashier) throw new PurchaseServiceError("Cashier is not active", "INVALID_ACTOR");
      await tx.cashierCommission.create({ data: {
        purchaseId: created.id,
        cashierId: input.cashierId,
        rateBasisPoints: cashier.commissionRateBasisPoints,
        amountCents: calculateCommissionCents(totals.totalCents, cashier.commissionRateBasisPoints),
      } });
      await tx.auditEvent.create({ data: {
        actorId: input.cashierId,
        action: "CASH_PURCHASE_CONFIRMED",
        entityType: "Purchase",
        entityId: created.id,
        metadata: { receiptCode, totalCents: totals.totalCents },
      } });
    }
    return created;
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

/** Backwards-compatible name for existing Pix checkout callers. */
export const createPendingPixPurchase = createPurchase;
