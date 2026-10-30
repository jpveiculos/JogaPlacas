import { NextRequest, NextResponse } from "next/server";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { classifyPixOrderStatus, getVerifiedPixOrder } from "@/modules/payments/mercado-pago";
import { confirmPixPayment } from "@/modules/payments/confirm-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };
type RouteContext = { params: Promise<{ purchaseId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers });
  if (user.role !== "PLAYER" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers });
  }

  const { purchaseId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(purchaseId)) {
    return NextResponse.json({ error: "Compra não encontrada." }, { status: 404, headers });
  }

  const purchase = await authPrisma.purchase.findFirst({
    where: { id: purchaseId, playerId: user.id },
    select: {
      id: true,
      status: true,
      receiptCode: true,
      confirmedAt: true,
      totalCents: true,
      currency: true,
      payment: {
        select: {
          id: true,
          status: true,
          provider: true,
          providerPaymentId: true,
          amountCents: true,
          confirmedAt: true,
          providerStatus: true,
          providerStatusDetail: true,
        },
      },
    },
  });
  if (!purchase) return NextResponse.json({ error: "Compra não encontrada." }, { status: 404, headers });

  const isConfirmed = () =>
    purchase.status === "CONFIRMED"
    && purchase.payment?.status === "CONFIRMED"
    && Boolean(purchase.receiptCode && purchase.confirmedAt && purchase.payment.confirmedAt);

  if (isConfirmed()) {
    return NextResponse.json({
      purchaseStatus: purchase.status,
      paymentStatus: purchase.payment?.status,
      providerStatus: purchase.payment?.providerStatus ?? null,
      providerStatusDetail: purchase.payment?.providerStatusDetail ?? null,
      receiptReady: true,
      receiptCode: purchase.receiptCode,
    }, { headers });
  }

  const payment = purchase.payment;
  if (!payment || payment.status !== "PENDING" || purchase.status !== "PENDING_PAYMENT"
    || payment.provider !== "MERCADO_PAGO" || !payment.providerPaymentId) {
    return NextResponse.json({
      purchaseStatus: purchase.status,
      paymentStatus: payment?.status ?? "PENDING",
      providerStatus: payment?.providerStatus ?? null,
      providerStatusDetail: payment?.providerStatusDetail ?? null,
      receiptReady: false,
    }, { headers });
  }

  try {
    // Fallback to the provider when webhook delivery is delayed or missed.
    // Both paths use confirmPixPayment, so concurrent calls are safe and idempotent.
    const order = await getVerifiedPixOrder(payment.providerPaymentId);
    const expectedReference = `jogaplacas_purchase_${purchase.id}`;
    if (order.orderId !== payment.providerPaymentId
      || order.externalReference !== expectedReference
      || order.currency !== "BRL"
      || purchase.currency !== "BRL"
      || order.amountCents !== payment.amountCents
      || order.amountCents !== purchase.totalCents
      || order.paymentMethodId !== "pix"
      || order.paymentMethodType !== "bank_transfer"
      || order.paymentAmountCents === null
      || order.paymentAmountCents !== payment.amountCents) {
      return NextResponse.json({ error: "Os dados do pagamento não correspondem à compra." }, { status: 422, headers });
    }

    const classification = classifyPixOrderStatus(order);
    await authPrisma.payment.update({
      where: { id: payment.id },
      data: {
        providerStatus: classification.providerStatus,
        providerStatusDetail: order.statusDetail,
      },
    });

    if (classification.approved) {
      const confirmation = await confirmPixPayment(authPrisma, {
        paymentId: payment.id,
        providerStatus: classification.providerStatus,
        providerStatusDetail: order.statusDetail,
      });
      if (confirmation.outcome === "confirmed" || confirmation.outcome === "already_confirmed") {
        return NextResponse.json({
          purchaseStatus: "CONFIRMED",
          paymentStatus: "CONFIRMED",
          providerStatus: classification.providerStatus,
          providerStatusDetail: order.statusDetail,
          receiptReady: true,
          receiptCode: confirmation.receiptCode,
        }, { headers });
      }
      if (confirmation.outcome === "late_or_unavailable") {
        return NextResponse.json({
          purchaseStatus: purchase.status,
          paymentStatus: payment.status,
          providerStatus: classification.providerStatus,
          providerStatusDetail: order.statusDetail,
          receiptReady: false,
          reconciliationRequired: true,
        }, { headers });
      }
    }

    return NextResponse.json({
      purchaseStatus: purchase.status,
      paymentStatus: payment.status,
      providerStatus: classification.providerStatus,
      providerStatusDetail: order.statusDetail,
      receiptReady: false,
    }, { headers });
  } catch {
    // The webhook remains active; a transient lookup failure must not change purchase state.
    return NextResponse.json({
      purchaseStatus: purchase.status,
      paymentStatus: payment.status,
      providerStatus: payment.providerStatus,
      providerStatusDetail: payment.providerStatusDetail,
      receiptReady: false,
    }, { headers });
  }
}
