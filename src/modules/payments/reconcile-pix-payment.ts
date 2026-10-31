import { type PrismaClient } from "@/generated/prisma/client";
import { classifyPixOrderStatus, getVerifiedPixOrder } from "@/modules/payments/mercado-pago";
import { confirmPixPayment } from "@/modules/payments/confirm-payment";

export type PixReconciliationOutcome =
  | "confirmed"
  | "already_confirmed"
  | "late_or_unavailable"
  | "not_pending"
  | "still_pending"
  | "terminal";

/**
 * Rechecks the canonical Mercado Pago order. Used by the authenticated status
 * endpoints as a fallback when a webhook is delayed or missed. Both channels
 * converge on confirmPixPayment, which is transactional and idempotent.
 */
export async function reconcilePixPaymentFromProvider(
  prisma: PrismaClient,
  paymentId: string,
): Promise<PixReconciliationOutcome> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      purchaseId: true,
      provider: true,
      providerPaymentId: true,
      amountCents: true,
      status: true,
      purchase: { select: { totalCents: true, status: true } },
    },
  });
  if (!payment || payment.provider !== "MERCADO_PAGO" || !payment.providerPaymentId) return "not_pending";
  if (payment.status === "CONFIRMED" && payment.purchase.status === "CONFIRMED") return "already_confirmed";
  if (payment.status !== "PENDING" || payment.purchase.status !== "PENDING_PAYMENT") return "not_pending";

  const order = await getVerifiedPixOrder(payment.providerPaymentId);
  if (order.orderId !== payment.providerPaymentId
    || order.externalReference !== `jogaplacas_purchase_${payment.purchaseId}`
    || order.currency !== "BRL"
    || order.amountCents !== payment.amountCents
    || order.amountCents !== payment.purchase.totalCents
    || order.paymentAmountCents !== payment.amountCents
    || order.paymentMethodId?.toLowerCase() !== "pix"
    || order.paymentMethodType?.toLowerCase() !== "bank_transfer") {
    throw new Error("Mercado Pago order does not match the pending Pix purchase");
  }

  const { providerStatus, normalizedStatus, approved } = classifyPixOrderStatus(order);
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerStatus, providerStatusDetail: order.statusDetail },
  });

  if (approved) {
    const result = await confirmPixPayment(prisma, {
      paymentId: payment.id,
      providerStatus,
      providerStatusDetail: order.statusDetail,
    });
    return result.outcome;
  }

  const terminalStatus = ["rejected", "failure", "failed"].includes(normalizedStatus)
    ? "FAILED"
    : ["cancelled", "canceled"].includes(normalizedStatus)
      ? "CANCELLED"
      : normalizedStatus === "expired"
        ? "EXPIRED"
        : normalizedStatus === "refunded"
          ? "REFUNDED"
          : null;
  if (!terminalStatus) return "still_pending";

  await prisma.$transaction(async (tx) => {
    const changed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: terminalStatus, providerStatus, providerStatusDetail: order.statusDetail },
    });
    if (changed.count !== 1) return;
    await tx.purchase.updateMany({
      where: { id: payment.purchaseId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED" },
    });
    await tx.purchaseParticipation.updateMany({
      where: { purchaseId: payment.purchaseId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    await tx.auditEvent.create({
      data: {
        action: "PIX_PAYMENT_TERMINAL_FAILURE",
        entityType: "Purchase",
        entityId: payment.purchaseId,
        metadata: { paymentId: payment.id, providerStatus, terminalStatus, source: "status_fallback" },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return "terminal";
}
