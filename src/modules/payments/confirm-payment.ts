import { randomBytes } from "node:crypto";
import { Prisma, RoundStatus, type PrismaClient } from "../../generated/prisma/client";

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
          select: { id: true, purchaseId: true, status: true, amountCents: true, purchase: { select: { status: true, totalCents: true, receiptCode: true } } },
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
          where: { purchaseId: paymentRow.purchaseId },
          select: { id: true, roundId: true },
          orderBy: { roundId: "asc" },
        });
        if (!participations.length) throw new Error("Purchase has no participations");
        const roundIds = [...new Set(participations.map((item) => item.roundId))].sort();
        await tx.$queryRaw`
          SELECT "id" FROM "Round"
          WHERE "id" IN (${Prisma.join(roundIds)})
          ORDER BY "id"
          FOR UPDATE
        `;

        const decisionTime = (await tx.$queryRaw<Array<{ decisionTime: Date }>>`
          SELECT clock_timestamp() AS "decisionTime"
        `)[0]!.decisionTime;
        const rounds = await tx.round.findMany({ where: { id: { in: roundIds } } });
        const roundById = new Map(rounds.map((round) => [round.id, round]));
        const eligible = participations.every((participation) => {
          const round = roundById.get(participation.roundId);
          return Boolean(round
            && round.cutoffAt.getTime() > decisionTime.getTime()
            && (round.status === RoundStatus.OPEN || round.status === RoundStatus.SCHEDULED));
        });

        if (!eligible) {
          // Money may have reached the provider after a cutoff. Keep the local
          // purchase and receipt pending for explicit reconciliation/refund;
          // never issue retroactive participation or an official receipt.
          await tx.payment.update({
            where: { id: paymentRow.id },
            data: { providerStatus: input.providerStatus, providerStatusDetail: input.providerStatusDetail },
          });
          await tx.auditEvent.create({
            data: {
              action: "PIX_PAYMENT_APPROVED_AFTER_CUTOFF",
              entityType: "Purchase",
              entityId: paymentRow.purchaseId,
              metadata: { paymentId: paymentRow.id, providerStatus: input.providerStatus, outcome: "manual_reconciliation_required" },
            },
          });
          return { outcome: "late_or_unavailable", reason: "CUTOFF_OR_ROUND_STATUS" } as const;
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
        await tx.auditEvent.create({
          data: {
            action: "PIX_PAYMENT_CONFIRMED",
            entityType: "Purchase",
            entityId: paymentRow.purchaseId,
            metadata: { paymentId: paymentRow.id, receiptCode, providerStatus: input.providerStatus },
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
