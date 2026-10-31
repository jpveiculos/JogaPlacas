import { randomBytes } from "node:crypto";
import { Prisma, RoundStatus, type PrismaClient } from "../../generated/prisma/client";
import { calculateCommissionCents } from "../../domain/cashier-commission";

export type ConfirmPaymentResult =
  | { outcome: "confirmed"; receiptCode: string }
  | { outcome: "already_confirmed"; receiptCode: string }
  | { outcome: "late_or_unavailable"; reason: string }
  | { outcome: "not_pending" };

/**
 * Confirms a provider-verified Pix payment exactly once. The transaction locks
 * the purchase and all participating rounds before evaluating cutoffs, matching
 * the lock protocol used by purchase creation and round closure.
 */
export async function confirmPixPayment(
  prisma: PrismaClient,
  input: { paymentId: string; providerStatus: string; providerStatusDetail: string | null },
): Promise<ConfirmPaymentResult> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const paymentRow = await tx.payment.findUnique({
          where: { id: input.paymentId },
          select: { id: true, purchaseId: true, status: true, amountCents: true, purchase: { select: { status: true, totalCents: true, receiptCode: true, cashierId: true } } },
        });
        if (!paymentRow) return { outcome: "not_pending" } as const;
        if (paymentRow.status === "CONFIRMED" && paymentRow.purchase.status === "CONFIRMED" && paymentRow.purchase.receiptCode) {
          return { outcome: "already_confirmed", receiptCode: paymentRow.purchase.receiptCode } as const;
        }
        if (paymentRow.status !== "PENDING" || paymentRow.purchase.status !== "PENDING_PAYMENT") {
          return { outcome: "not_pending" } as const;
        }
        if (paymentRow.amountCents !== paymentRow.purchase.totalCents) {
          throw new Error("Persisted payment and purchase totals do not match");
        }

        const participations = await tx.purchaseParticipation.findMany({
          where: { purchaseId: paymentRow.purchaseId, status: "PENDING" },
          select: { id: true, roundId: true, totalCents: true },
          orderBy: [{ round: { resultAt: "asc" } }, { id: "asc" }],
        });
        if (!participations.length) throw new Error("Purchase has no pending participations");

        const originalRoundIds = [...new Set(participations.map((item) => item.roundId))].sort();
        // Lock the provisional rounds and every currently eligible future round
        // in one deterministic order. The target round is selected only after
        // these locks are acquired and PostgreSQL's wall clock is read.
        await tx.$queryRaw`
          SELECT "id" FROM "Round"
          WHERE "id" IN (${Prisma.join(originalRoundIds)})
             OR ("status" IN ('OPEN', 'SCHEDULED') AND "cutoffAt" > clock_timestamp())
          ORDER BY "id"
          FOR UPDATE
        `;

        const decisionTime = (await tx.$queryRaw<Array<{ decisionTime: Date }>>`
          SELECT clock_timestamp() AS "decisionTime"
        `)[0]!.decisionTime;
        const [originalRounds, availableRounds] = await Promise.all([
          tx.round.findMany({ where: { id: { in: originalRoundIds } } }),
          tx.round.findMany({
            where: {
              status: { in: [RoundStatus.OPEN, RoundStatus.SCHEDULED] },
              cutoffAt: { gt: decisionTime },
            },
            orderBy: [{ resultAt: "asc" }, { id: "asc" }],
          }),
        ]);
        const targetRounds = availableRounds.slice(0, participations.length);
        if (targetRounds.length !== participations.length) {
          await tx.payment.update({
            where: { id: paymentRow.id },
            data: { providerStatus: input.providerStatus, providerStatusDetail: input.providerStatusDetail },
          });
          await tx.auditEvent.create({
            data: {
              action: "PIX_PAYMENT_APPROVED_WITHOUT_AVAILABLE_ROUNDS",
              entityType: "Purchase",
              entityId: paymentRow.purchaseId,
              metadata: {
                paymentId: paymentRow.id,
                decisionTime: decisionTime.toISOString(),
                requiredParticipations: participations.length,
                availableParticipations: targetRounds.length,
                originalRounds: originalRounds.map((round) => ({
                  code: round.code, startsAt: round.startsAt.toISOString(),
                  cutoffAt: round.cutoffAt.toISOString(), resultAt: round.resultAt.toISOString(),
                })),
                outcome: "manual_reconciliation_required",
              },
            },
          });
          return { outcome: "late_or_unavailable", reason: "NO_NEXT_VALID_ROUND" } as const;
        }

        const originalById = new Map(originalRounds.map((round) => [round.id, round]));
        // Move from the last participation backwards so overlapping old/new
        // round IDs cannot violate the unique (purchaseId, roundId) constraint.
        for (let index = participations.length - 1; index >= 0; index -= 1) {
          const participation = participations[index]!;
          const target = targetRounds[index]!;
          if (participation.roundId !== target.id) {
            await tx.purchaseParticipation.update({
              where: { id: participation.id },
              data: { roundId: target.id, totalCents: participation.totalCents },
            });
          }
        }

        const now = decisionTime;
        const receiptCode = `JP-${randomBytes(8).toString("hex").toUpperCase()}`;
        await tx.payment.update({
          where: { id: paymentRow.id },
          data: {
            status: "CONFIRMED",
            providerStatus: input.providerStatus,
            providerStatusDetail: input.providerStatusDetail,
            confirmedAt: now,
          },
        });
        await tx.purchaseParticipation.updateMany({
          where: { purchaseId: paymentRow.purchaseId, status: "PENDING" },
          data: { status: "CONFIRMED", confirmedAt: now },
        });
        await tx.purchase.update({
          where: { id: paymentRow.purchaseId },
          data: { status: "CONFIRMED", confirmedAt: now, receiptCode },
        });
        if (paymentRow.purchase.cashierId) {
          const cashier = await tx.user.findFirst({
            where: { id: paymentRow.purchase.cashierId, role: "CASHIER" },
            select: { commissionRateBasisPoints: true },
          });
          if (!cashier) throw new Error("Cashier commission owner is invalid");
          const rateBasisPoints = cashier.commissionRateBasisPoints;
          const amountCents = calculateCommissionCents(paymentRow.purchase.totalCents, rateBasisPoints);
          await tx.cashierCommission.create({
            data: {
              purchaseId: paymentRow.purchaseId,
              cashierId: paymentRow.purchase.cashierId,
              rateBasisPoints,
              amountCents,
            },
          });
        }
        await tx.auditEvent.create({
          data: {
            action: "PIX_PAYMENT_CONFIRMED",
            entityType: "Purchase",
            entityId: paymentRow.purchaseId,
            metadata: {
              paymentId: paymentRow.id,
              receiptCode,
              providerStatus: input.providerStatus,
              decisionTime: now.toISOString(),
              originalRounds: participations.map((participation) => {
                const round = originalById.get(participation.roundId);
                return round ? { code: round.code, startsAt: round.startsAt.toISOString(), cutoffAt: round.cutoffAt.toISOString(), resultAt: round.resultAt.toISOString() } : { roundId: participation.roundId };
              }),
              assignedRounds: targetRounds.map((round) => ({
                code: round.code, startsAt: round.startsAt.toISOString(),
                cutoffAt: round.cutoffAt.toISOString(), resultAt: round.resultAt.toISOString(),
              })),
            },
          },
        });
        return { outcome: "confirmed", receiptCode } as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const serializationConflict = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === "P2034"
          || (error.code === "P2010" && (error.meta?.code === "40001"
            || error.message.toLowerCase().includes("could not serialize access"))));
      if (serializationConflict && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}
