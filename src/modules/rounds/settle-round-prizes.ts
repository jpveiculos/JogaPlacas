import { Prisma, RoundStatus, type PrismaClient } from "../../generated/prisma/client";
import { readPrizeMultipliers, type PrizeCategory } from "../../domain/prize-rule-snapshot";

type PlateFormat = "LEGACY" | "MERCOSUR";
const ALLOCATION_FIELD: Record<PrizeCategory, "unitCents" | "tensCents" | "hundredsCents" | "thousandsCents" | "lettersCents" | "fullPlateCents"> = {
  unit: "unitCents", tens: "tensCents", hundreds: "hundredsCents",
  thousands: "thousandsCents", letters: "lettersCents", fullPlate: "fullPlateCents",
};

export class RoundSettlementError extends Error {
  constructor(message: string, public readonly code: "ROUND_NOT_FOUND" | "ROUND_NOT_DRAWN" | "INVALID_PLATE_RESULT" | "INVALID_PLATE_BET" | "INVALID_RULE_SNAPSHOT" | "INCONSISTENT_SETTLEMENT") {
    super(message);
    this.name = "RoundSettlementError";
  }
}

export type SettlementLine = {
  plateFormat: PlateFormat;
  normalizedPlate: string;
  unitCents: number;
  tensCents: number;
  hundredsCents: number;
  thousandsCents: number;
  lettersCents: number;
  fullPlateCents: number;
  ruleVersion: string;
  ruleSnapshot: unknown;
};

function compactPlate(value: string): string {
  return value.toUpperCase().replaceAll("-", "").replaceAll(/\s+/g, "");
}

function isValidPlate(format: PlateFormat, value: string): boolean {
  return format === "LEGACY"
    ? /^[A-Z]{3}-?\d{4}$/.test(value)
    : /^[A-Z]{3}\d[A-Z]\d{2}$/.test(value);
}

function isSerializationConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return error.code === "P2034" ||
    (error.code === "P2010" && (error.meta?.code === "40001" || error.message.toLowerCase().includes("could not serialize access")));
}

/**
 * Compare literal suffixes of length 1/2/3/4 for unit/tens/hundreds/thousands.
 * Mercosur letters are never converted to digits. Amounts use integer cents.
 */
export function calculateLinePrizeCents(line: SettlementLine, legacyResult: string, mercosurResult: string): number {
  const result = line.plateFormat === "LEGACY" ? legacyResult : mercosurResult;
  if (!isValidPlate(line.plateFormat, result)) {
    throw new RoundSettlementError("Result does not match its plate format", "INVALID_PLATE_RESULT");
  }
  if (!isValidPlate(line.plateFormat, line.normalizedPlate)) {
    throw new RoundSettlementError("Stored bet does not match its declared plate format", "INVALID_PLATE_BET");
  }
  const multipliers = readPrizeMultipliers(line.ruleVersion, line.ruleSnapshot);
  if (!multipliers) {
    throw new RoundSettlementError("Stored rule snapshot is missing valid historical multipliers", "INVALID_RULE_SNAPSHOT");
  }
  const bet = compactPlate(line.normalizedPlate);
  const drawn = compactPlate(result);
  const categories: Array<{ category: PrizeCategory; matches: boolean }> = [
    { category: "unit", matches: bet.slice(-1) === drawn.slice(-1) },
    { category: "tens", matches: bet.slice(-2) === drawn.slice(-2) },
    { category: "hundreds", matches: bet.slice(-3) === drawn.slice(-3) },
    { category: "thousands", matches: bet.slice(-4) === drawn.slice(-4) },
    { category: "letters", matches: bet.slice(0, 3) === drawn.slice(0, 3) },
    { category: "fullPlate", matches: bet === drawn },
  ];
  // Validate every stored allocation, including categories that did not win.
  // Otherwise malformed negative/non-integer values in a losing category could
  // survive settlement and corrupt the financial record.
  for (const item of categories) {
    const stake = line[ALLOCATION_FIELD[item.category]];
    if (!Number.isSafeInteger(stake) || stake < 0) {
      throw new RoundSettlementError("Invalid stake allocation", "INCONSISTENT_SETTLEMENT");
    }
  }

  let total = 0;
  for (const item of categories) {
    if (!item.matches) continue;
    const stake = line[ALLOCATION_FIELD[item.category]];
    const amount = stake * multipliers[item.category];
    if (!Number.isSafeInteger(amount) || amount > 2_147_483_647) {
      throw new RoundSettlementError("Prize exceeds the database integer range", "INCONSISTENT_SETTLEMENT");
    }
    total += amount;
    if (!Number.isSafeInteger(total) || total > 2_147_483_647) {
      throw new RoundSettlementError("Total prize exceeds the database integer range", "INCONSISTENT_SETTLEMENT");
    }
  }
  return total;
}

/**
 * Idempotently settles confirmed lines in a completed round. Online player prizes
 * are credited to that player's wallet in the same transaction. Awards for physical
 * cashier sales without a linked player wallet remain pending until the customer
 * claims through the receipt QR/official platform support; a cashier must never pay
 * or mark a prize as paid. Platform support/admin handles the authorized payout.
 */
export async function settleRoundPrizes(prisma: PrismaClient, roundId: string, actorId: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT "id" FROM "Round" WHERE "id" = $1 FOR UPDATE', roundId,
        );
        if (locked.length === 0) throw new RoundSettlementError("Round not found", "ROUND_NOT_FOUND");

        const round = await tx.round.findUnique({ where: { id: roundId } });
        if (!round) throw new RoundSettlementError("Round not found", "ROUND_NOT_FOUND");
        if (round.status !== RoundStatus.COMPLETED || !round.resultLegacyPlate || !round.resultMercosurPlate) {
          throw new RoundSettlementError("Both draws must exist and the round must be completed", "ROUND_NOT_DRAWN");
        }
        if (!isValidPlate("LEGACY", round.resultLegacyPlate) || !isValidPlate("MERCOSUR", round.resultMercosurPlate)) {
          throw new RoundSettlementError("Stored results do not match their formats", "INVALID_PLATE_RESULT");
        }

        await tx.$queryRawUnsafe(
          'SELECT pl."id" FROM "ParticipationLine" pl JOIN "PurchaseParticipation" pp ON pp."id" = pl."participationId" JOIN "Purchase" p ON p."id" = pp."purchaseId" WHERE pp."roundId" = $1 AND pp."status" = \'CONFIRMED\' AND p."status" = \'CONFIRMED\' ORDER BY pl."id" FOR UPDATE OF pl',
          roundId,
        );

        const lines = await tx.participationLine.findMany({
          where: { participation: { is: { roundId, status: "CONFIRMED", purchase: { is: { status: "CONFIRMED" } } } } },
          include: { participation: { include: { purchase: true } } },
          orderBy: { id: "asc" },
        });

        let creditedLines = 0;
        let pendingManualPayouts = 0;
        let totalPrizeCents = 0;
        for (const line of lines) {
          const prize = calculateLinePrizeCents({
            plateFormat: line.plateFormat,
            normalizedPlate: line.normalizedPlate,
            unitCents: line.unitCents,
            tensCents: line.tensCents,
            hundredsCents: line.hundredsCents,
            thousandsCents: line.thousandsCents,
            lettersCents: line.lettersCents,
            fullPlateCents: line.fullPlateCents,
            ruleVersion: line.ruleVersion,
            ruleSnapshot: line.ruleSnapshot,
          }, round.resultLegacyPlate, round.resultMercosurPlate);

          if (line.prizeCents !== null && line.prizeCents !== prize) {
            throw new RoundSettlementError("Stored prize differs from deterministic recalculation for line " + line.id, "INCONSISTENT_SETTLEMENT");
          }
          if (line.prizeCents === null) {
            await tx.participationLine.update({ where: { id: line.id }, data: { prizeCents: prize } });
          }
          totalPrizeCents += prize;
          if (!Number.isSafeInteger(totalPrizeCents)) {
            throw new RoundSettlementError("Round prize total exceeds safe integer range", "INCONSISTENT_SETTLEMENT");
          }
          if (prize === 0) continue;

          const purchase = line.participation.purchase;
          const playerId = purchase.playerId;
          // Only purchases made directly by an online player may be credited to a wallet.
          // Cashier-originated purchases must always remain pending for platform support,
          // even if legacy/inconsistent data happens to contain a playerId.
          if (!playerId || purchase.cashierId !== null) {
            pendingManualPayouts += 1;
            continue;
          }

          const idempotencyKey = "prize-credit:" + line.id;
          const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
          if (existing) {
            if (existing.userId !== playerId || existing.amountCents !== prize ||
                existing.type !== "PRIZE_CREDIT" || existing.participationId !== line.participationId) {
              throw new RoundSettlementError("Existing prize ledger entry conflicts with calculated award", "INCONSISTENT_SETTLEMENT");
            }
          } else {
            await tx.ledgerEntry.create({
              data: {
                userId: playerId,
                purchaseId: line.participation.purchaseId,
                participationId: line.participationId,
                type: "PRIZE_CREDIT",
                amountCents: prize,
                currency: line.participation.purchase.currency,
                idempotencyKey,
                description: "Prêmio da rodada " + round.code + " — linha " + line.id,
              },
            });
          }
          if (line.prizeCreditedAt === null) {
            await tx.participationLine.update({ where: { id: line.id }, data: { prizeCreditedAt: new Date() } });
          }
          creditedLines += 1;
        }

        // Keep the success audit event in the same transaction as prize credits.
        // If audit persistence fails, the financial settlement rolls back as well.
        await tx.auditEvent.create({
            data: {
              actorId,
              action: "ROUND_PRIZES_SETTLED",
              entityType: "Round",
              entityId: roundId,
              metadata: {
                eligibleLines: lines.length,
                creditedLines,
                pendingManualPayouts,
                totalPrizeCents,
              },
            },
          });

        return {
          roundId,
          status: "settled" as const,
          eligibleLines: lines.length,
          creditedLines,
          pendingManualPayouts,
          totalPrizeCents,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isSerializationConflict(error) && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}
