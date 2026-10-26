import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@/lib/auth/session";
import { getVerifiedPixOrder, verifyMercadoPagoWebhookSignature } from "@/modules/payments/mercado-pago";

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
 * Authenticates the notification and reconciles provider state from Mercado Pago.
 * This endpoint deliberately does not confirm purchases yet: receipt/participation
 * confirmation must go through the domain's cutoff-aware transaction service.
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

    const expectedReference = `jogaplacas_purchase_${payment.purchaseId}`;
    if (order.externalReference !== expectedReference
      || order.amountCents !== payment.amountCents
      || order.amountCents !== payment.purchase.totalCents
      || (order.paymentAmountCents !== null && order.paymentAmountCents !== payment.amountCents)) {
      return response({ error: "Provider payment does not match the recorded purchase." }, 422);
    }

    const eventId = String(body.id ?? `${body.type ?? "unknown"}:${resourceId}:${requestId}`);
    const digest = createHash("sha256").update(rawBody).digest("hex");
    await authPrisma.$transaction(async (tx) => {
      const existing = await tx.webhookEvent.findUnique({
        where: { provider_providerEventId: { provider: "MERCADO_PAGO", providerEventId: eventId } },
        select: { id: true },
      });
      if (existing) return;

      const event = await tx.webhookEvent.create({
        data: {
          provider: "MERCADO_PAGO",
          providerEventId: eventId,
          eventType: String(body.type ?? body.action ?? "unknown").slice(0, 100),
          payloadDigest: digest,
          paymentId: payment.id,
        },
        select: { id: true },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerStatus: order.status,
          providerStatusDetail: order.statusDetail,
        },
      });
      await tx.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    });

    return response({ received: true }, 200);
  } catch {
    // Do not leak provider responses, payloads, database details or credentials.
    return response({ error: "Webhook reconciliation temporarily unavailable." }, 503);
  }
}
