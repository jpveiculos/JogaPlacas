import { Prisma, RoundStatus, type PrismaClient } from "../../generated/prisma/client";
import { drawPlate } from "../plates/draw-plate";

export class RoundDrawError extends Error {
  constructor(
    message: string,
    public readonly code: "ROUND_NOT_FOUND" | "ROUND_NOT_CLOSED" | "DRAW_NOT_DUE" | "INCONSISTENT_DRAW",
  ) {
    super(message);
    this.name = "RoundDrawError";
  }
}

/**
 * Persist both independently generated results exactly once for a closed round.
 * No production migration or payment/prize operation is performed here.
 */
export async function drawRoundResults(
  prisma: PrismaClient,
  roundId: string,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Round" WHERE "id" = ${roundId} FOR UPDATE
    `;
    if (locked.length === 0) {
      throw new RoundDrawError("Round was not found", "ROUND_NOT_FOUND");
    }

    const round = await tx.round.findUnique({ where: { id: roundId } });
    if (!round) {
      throw new RoundDrawError("Round was not found", "ROUND_NOT_FOUND");
    }

    const hasLegacy = round.resultLegacyPlate !== null;
    const hasMercosur = round.resultMercosurPlate !== null;
    if (hasLegacy && hasMercosur) {
      if (round.status !== RoundStatus.COMPLETED) {
        throw new RoundDrawError("Both results exist but the round is not completed", "INCONSISTENT_DRAW");
      }
      return round;
    }
    if (hasLegacy !== hasMercosur) {
      throw new RoundDrawError("Only one draw result exists; manual reconciliation is required", "INCONSISTENT_DRAW");
    }
    if (round.status !== RoundStatus.CLOSED) {
      throw new RoundDrawError("Round must be closed before drawing results", "ROUND_NOT_CLOSED");
    }
    const [{ databaseNow }] = await tx.$queryRaw<Array<{ databaseNow: Date }>>`
      SELECT clock_timestamp() AS "databaseNow"
    `;
    if (databaseNow.getTime() < round.resultAt.getTime()) {
      throw new RoundDrawError("Scheduled result time has not been reached", "DRAW_NOT_DUE");
    }

    const resultLegacyPlate = drawPlate("legacy");
    const resultMercosurPlate = drawPlate("mercosur");
    const completed = await tx.round.update({
      where: { id: roundId },
      data: {
        resultLegacyPlate,
        resultMercosurPlate,
        status: RoundStatus.COMPLETED,
      },
    });

    await tx.auditEvent.create({
      data: {
        ...(actorId ? { actorId } : {}),
        action: actorId ? "ROUND_RESULTS_DRAWN" : "ROUND_RESULTS_DRAWN_AUTOMATICALLY",
        entityType: "Round",
        entityId: roundId,
        metadata: {
          resultLegacyPlate,
          resultMercosurPlate,
          method: "independent_secure_random",
          source: actorId ? "admin" : "scheduler",
        },
      },
    });
    return completed;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
