import { NextRequest, NextResponse } from "next/server";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { classifyPixOrderStatus, getVerifiedPixOrder } from "@/modules/payments/mercado-pago";
import { confirmPixPayment } from "@/modules/payments/confirm-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers });
  }
  if (user.role !== "PLAYER" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers });
  }

  const { id } = await context.params;
  const purchase = await authPrisma.purchase.findFirst({
    where: { id, playerId: user.id },
    select: {
      id: true,
      status: true,
      receiptCode: true,
      totalCents: true,
      currency: true,
      payment: {
        select: {
          id: true,
          status: true,
          provider: true,
          providerPaymentId: true,
          amountCents: true,
        },
      },
    },
  });

  if (!purchase) {
    return NextResponse.json({ error: "Compra não encontrada." }, { status: 404, headers });
  }

  if (purchase.status === "CONFIRMED" && purchase.receiptCode) {
    return NextResponse.json({
      status: "CONFIRMED",
      paymentStatus: "CONFIRMED",
      purchaseStatus: "CONFIRMED",
      receiptReady: true,
      purchaseId: purchase.id,
      receiptCode: purchase.receiptCode,
    }, { headers });
  }

  const payment = purchase.payment;
  if (!payment || payment.provider !== "MERCADO_PAGO" || !payment.providerPaymentId) {
    return NextResponse.json({ status: purchase.status, purchaseStatus: purchase.status, paymentStatus: payment?.status ?? null, receiptReady: false }, { headers });
  }

  try {
    // Mercado Pago is queried directly; browser polling does not depend on webhook delivery.
    const order = await getVerifiedPixOrder(payment.providerPaymentId);
    const expectedReference = `jogaplacas_purchase_${purchase.id}`;
    if (
      order.orderId !== payment.providerPaymentId ||
      order.externalReference !== expectedReference ||
      order.currency !== "BRL" ||
      purchase.currency !== "BRL" ||
      order.amountCents !== payment.amountCents ||
      order.amountCents !== purchase.totalCents ||
      (order.paymentAmountCents !== null && order.paymentAmountCents !== payment.amountCents)
    ) {
      return NextResponse.json({ error: "Os dados do pagamento não correspondem à compra." }, { status: 422, headers });
    }

    const classification = classifyPixOrderStatus(order);
    await authPrisma.payment.update({
      where: { id: payment.id },
      data: {
        providerStatus: order.status,
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
          status: "CONFIRMED",
          paymentStatus: "CONFIRMED",
          purchaseStatus: "CONFIRMED",
          receiptReady: true,
          purchaseId: purchase.id,
          receiptCode: confirmation.receiptCode,
        }, { headers });
      }
      if (confirmation.outcome === "late_or_unavailable") {
        return NextResponse.json({
          status: "RECONCILIATION_REQUIRED",
          paymentStatus: payment.status,
          purchaseStatus: purchase.status,
          receiptReady: false,
          message: "Pagamento recebido após o fechamento da rodada. É necessária uma conferência.",
        }, { headers });
      }
    }

    return NextResponse.json({
      status: payment.status,
      paymentStatus: payment.status,
      purchaseStatus: purchase.status,
      providerStatus: classification.providerStatus,
      receiptReady: false,
    }, { headers });
  } catch {
    return NextResponse.json({
      status: payment.status,
      paymentStatus: payment.status,
      purchaseStatus: purchase.status,
      receiptReady: false,
      message: "Não foi possível consultar o pagamento agora. Tente novamente.",
    }, { status: 503, headers });
  }
}
