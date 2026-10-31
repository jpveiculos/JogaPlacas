import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@/lib/auth/session";
import { classifyPixOrderStatus, getVerifiedPixOrder, verifyMercadoPagoWebhookSignature } from "@/modules/payments/mercado-pago";
import { confirmPixPayment } from "@/modules/payments/confirm-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

type MercadoPagoWebhookBody = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function response(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers });
}

/**
 * Authenticates the notification, reconciles canonical provider state, and sends
 * approved payments through the domain's cutoff-aware confirmation transaction.
 * The webhook payload itself is never treated as proof of payment.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) return response({ error: "Webhook is not configured." }, 503);

  const dataId = request.nextUrl.searchParams.get("data.id")
    ?? request.nextUrl.searchParams.get("id");
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");
  if (!dataId || !requestId || !signature ||
    !verifyMercadoPagoWebhookSignature({ dataId, requestId, signatureHeader: signature, secret })) {
    return response({ error: "Invalid webhook signature." }, 401);
  }

  let rawBody: string;
  let body: MercadoPagoWebhookBody;
  try {
    rawBody = await request.text();
    body = JSON.parse(rawBody) as MercadoPagoWebhookBody;
  } catch {
    return response({ error: "Invalid webhook payload." }, 400);
  }

  const resourceId = String(body.data?.id ?? dataId);
  if (resourceId !== dataId) return response({ error: "Webhook resource mismatch." }, 400);

  try {
    // Fetch canonical state from the provider; the body itself is never trusted
    // as evidence that money was received.
    const order = await getVerifiedPixOrder(resourceId);
    if (order.orderId !== resourceId) return response({ error: "Provider resource mismatch." }, 400);

    const payment = await authPrisma.payment.findFirst({
      where: { provider: "MERCADO_PAGO", providerPaymentId: resourceId },
      select: { id: true, purchaseId: true, amountCents: true, purchase: { select: { totalCents: true } } },
    });
    if (!payment) {
      // The provider may notify before the checkout request persisted its order ID.
      // Return retryable status instead of acknowledging an event we cannot reconcile.
      return response({ error: "Payment mapping not found yet." }, 503);
    }

    const expectedReference = "jogaplacas_purchase_" + payment.purchaseId;
    const { providerStatus, normalizedStatus, approved } = classifyPixOrderStatus(order);
    const methodMismatch = (order.paymentMethodId !== null && order.paymentMethodId.toLowerCase() !== "pix")
      || (order.paymentMethodType !== null && order.paymentMethodType.toLowerCase() !== "bank_transfer");
    const approvedPaymentMismatch = approved && (
      order.paymentAmountCents !== payment.amountCents
      || order.paymentMethodId?.toLowerCase() !== "pix"
      || order.paymentMethodType?.toLowerCase() !== "bank_transfer"
    );
    if (order.externalReference !== expectedReference
      || order.currency !== "BRL"
      || order.amountCents !== payment.amountCents
      || order.amountCents !== payment.purchase.totalCents
      || methodMismatch
      || approvedPaymentMismatch) {
      return response({ error: "Provider payment does not match the recorded purchase." }, 422);
    }

    const eventId = String(body.id ?? `${body.type ?? "unknown"}:${resourceId}:${requestId}`);
    const digest = createHash("sha256").update(rawBody).digest("hex");
    const eventState = await authPrisma.$transaction(async (tx) => {
      const existing = await tx.webhookEvent.findUnique({
        where: { provider_providerEventId: { provider: "MERCADO_PAGO", providerEventId: eventId } },
        select: { id: true, processedAt: true },
      });
      if (existing?.processedAt) return { alreadyProcessed: true, eventId: existing.id };

      const event = existing ?? await tx.webhookEvent.create({
        data: {
          provider: "MERCADO_PAGO",
          providerEventId: eventId,
          eventType: String(body.type ?? body.action ?? "unknown").slice(0, 100),
          payloadDigest: digest,
          paymentId: payment.id,
        },
        select: { id: true, processedAt: true },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerStatus: order.status,
          providerStatusDetail: order.statusDetail,
        },
      });
      return { alreadyProcessed: false, eventId: event.id };
    });
    if (eventState.alreadyProcessed) return response({ received: true, duplicate: true }, 200);

    const markEventProcessed = async () => {
      await authPrisma.webhookEvent.updateMany({
        where: { id: eventState.eventId, processedAt: null },
        data: { processedAt: new Date(), processingError: null },
      });
    };

    // An order-level terminal state (especially refunded) takes precedence over
    // an older transaction-level "approved" state. Confirmation requires both
    // the order and its Pix transaction to be in their successful states.
    if (approved) {
      const confirmation = await confirmPixPayment(authPrisma, {
        paymentId: payment.id,
        providerStatus,
        providerStatusDetail: order.statusDetail,
      });
      if (confirmation.outcome === "late_or_unavailable") {
        // Acknowledge the provider event but leave purchase/receipt pending for
        // an explicit refund/reconciliation decision; never confirm retroactively.
        await markEventProcessed();
        return response({ received: true, reconciliationRequired: true }, 200);
      }
    } else {
      // A provider-final negative result must close the pending purchase without
      // issuing a receipt. Only pending records may transition; delayed duplicate
      // notifications must never undo a previously confirmed purchase.
      const terminalStatus = ["rejected", "failure", "failed"].includes(normalizedStatus)
        ? "FAILED"
        : ["cancelled", "canceled"].includes(normalizedStatus)
          ? "CANCELLED"
          : normalizedStatus === "expired"
          ? "EXPIRED"
          : normalizedStatus === "refunded"
            ? "REFUNDED"
            : null;
      if (terminalStatus) {
        await authPrisma.$transaction(async (tx) => {
          const changed = await tx.payment.updateMany({
            where: { id: payment.id, status: "PENDING" },
            data: {
              status: terminalStatus,
              providerStatus,
              providerStatusDetail: order.statusDetail,
            },
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
              metadata: { paymentId: payment.id, providerStatus, terminalStatus },
            },
          });
        }, { isolationLevel: "Serializable" });
      }
    }

    await markEventProcessed();
    return response({ received: true }, 200);
  } catch {
    // Leave the event unprocessed on failure so the provider's retry can safely
    // resume reconciliation instead of being acknowledged as complete.
    // Do not leak provider responses, payloads, database details or credentials.
    return response({ error: "Webhook reconciliation temporarily unavailable." }, 503);
  }
}
