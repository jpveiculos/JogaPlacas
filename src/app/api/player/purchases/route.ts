import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCurrentPrizeRuleSnapshot, CURRENT_PRIZE_RULE_VERSION } from "@/domain/prize-rule-snapshot";
import { createPendingPixPurchase, PurchaseServiceError } from "@/modules/purchases/create-purchase";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { createPixOrder, getPixOrder } from "@/modules/payments/mercado-pago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lineSchema = z.object({
  plateDisplay: z.string().trim().min(1).max(16),
  stakeCents: z.number().int().safe().min(100).max(2_000_000_000),
}).strict();

const requestSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(200),
  roundIds: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
  lines: z.array(lineSchema).min(1).max(100),
  paymentMethod: z.enum(["PIX", "WALLET"]).default("PIX"),
}).strict();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
    }
    // Em hospedagens atrás de proxy (como Railway), nextUrl.origin pode refletir
    // a origem interna. Compare o host do navegador com os hosts públicos encaminhados.
    const acceptedHosts = [
      request.headers.get("x-forwarded-host"),
      request.headers.get("host"),
      request.nextUrl.host,
    ]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!acceptedHosts.includes(originHost)) {
      return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
    }
  }

  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (user.role !== "PLAYER" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success || new Set(parsed.data?.roundIds ?? []).size !== (parsed.data?.roundIds.length ?? 0)) {
    return NextResponse.json({ error: "Informe a quantidade de rodadas, placas válidas e valores em centavos." }, { status: 400 });
  }

  const snapshot = createCurrentPrizeRuleSnapshot();
  try {
    const purchase = await createPendingPixPurchase(authPrisma, {
      idempotencyKey: parsed.data.idempotencyKey,
      playerId: user.id,
      paymentMethod: parsed.data.paymentMethod,
      repetitions: parsed.data.roundIds.length,
      participations: parsed.data.roundIds.map((roundId) => ({
        roundId,
        lines: parsed.data.lines.map((line) => ({
          plateDisplay: line.plateDisplay,
          stakeCents: line.stakeCents,
          ruleVersion: CURRENT_PRIZE_RULE_VERSION,
          ruleSnapshot: snapshot,
        })),
      })),
    });

    if (parsed.data.paymentMethod === "WALLET") {
      if (purchase.status !== "CONFIRMED" || purchase.paymentMethod !== "WALLET" || !purchase.receiptCode || !purchase.confirmedAt) {
        return NextResponse.json({ error: "Não foi possível confirmar o pagamento com saldo. Atualize a carteira e tente novamente." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({
        purchase: {
          id: purchase.id, receiptCode: purchase.receiptCode, status: purchase.status,
          paymentStatus: "CONFIRMED", totalCents: purchase.totalCents, currency: purchase.currency,
          participations: purchase.participations.map((participation) => ({
            roundId: participation.roundId, totalCents: participation.totalCents,
            lines: participation.lines.map((line) => ({
              plateDisplay: line.plateDisplay,
              totalCents: line.unitCents + line.tensCents + line.hundredsCents + line.thousandsCents + line.lettersCents + line.fullPlateCents,
              allocationCents: { unit: line.unitCents, tens: line.tensCents, hundreds: line.hundredsCents, thousands: line.thousandsCents, letters: line.lettersCents, fullPlate: line.fullPlateCents },
            })),
          })),
        },
        paymentActionRequired: false, receiptReady: true,
        message: "Pagamento realizado com o saldo da conta. O valor foi debitado e o recibo oficial está disponível.",
      }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    let pixCheckout: { copyPaste: string | null; qrCodeBase64: string | null; ticketUrl: string | null } | null = null;
    const payment = purchase.payment;
    if (payment && process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
      try {
        const checkout = payment.providerPaymentId
          ? await getPixOrder(payment.providerPaymentId)
          : await createPixOrder({
              purchaseId: purchase.id,
              paymentIdempotencyKey: payment.idempotencyKey,
              playerId: user.id,
              amountCents: purchase.totalCents,
            });
        if (checkout) {
          const updated = await authPrisma.payment.update({
            where: { id: payment.id },
            data: {
              providerPaymentId: checkout.orderId,
              pixCopyPaste: checkout.qrCode,
              pixQrCodeBase64: checkout.qrCodeBase64,
              pixTicketUrl: checkout.ticketUrl,
              providerStatus: checkout.status,
              providerStatusDetail: checkout.statusDetail,
            },
            select: { pixCopyPaste: true, pixQrCodeBase64: true, pixTicketUrl: true },
          });
          pixCheckout = {
            copyPaste: updated.pixCopyPaste,
            qrCodeBase64: updated.pixQrCodeBase64,
            ticketUrl: updated.pixTicketUrl,
          };
        }
      } catch {
        return NextResponse.json({
          error: "A compra foi registrada, mas não foi possível preparar o Pix agora. Tente novamente; a mesma chave de idempotência será reutilizada.",
          code: "PIX_CHECKOUT_UNAVAILABLE",
          purchaseId: purchase.id,
        }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }
    }

    return NextResponse.json({
      purchase: {
        id: purchase.id,
        receiptCode: purchase.receiptCode,
        status: purchase.status,
        paymentStatus: purchase.payment?.status ?? "PENDING",
        totalCents: purchase.totalCents,
        currency: purchase.currency,
        participations: purchase.participations.map((participation) => ({
          roundId: participation.roundId,
          totalCents: participation.totalCents,
          lines: participation.lines.map((line) => ({
            plateDisplay: line.plateDisplay,
            totalCents: line.unitCents + line.tensCents + line.hundredsCents
              + line.thousandsCents + line.lettersCents + line.fullPlateCents,
            allocationCents: {
              unit: line.unitCents,
              tens: line.tensCents,
              hundreds: line.hundredsCents,
              thousands: line.thousandsCents,
              letters: line.lettersCents,
              fullPlate: line.fullPlateCents,
            },
          })),
        })),
      },
      pixCheckout,
      paymentActionRequired: true,
      message: pixCheckout
        ? "Pix preparado. A compra e o recibo continuam pendentes até a confirmação autêntica do Mercado Pago."
        : "Compra registrada como pendente. Nenhum recibo foi emitido porque o pagamento ainda não foi confirmado. A cobrança Pix ainda não foi criada: configure as credenciais do Mercado Pago no ambiente de desenvolvimento.",
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PurchaseServiceError) {
      const status = error.code === "INVALID_ACTOR" ? 403
        : error.code === "INSUFFICIENT_BALANCE" || error.code === "IDEMPOTENCY_CONFLICT" ? 409
          : error.code === "ROUND_UNAVAILABLE" ? 409
            : error.code === "INVALID_IDEMPOTENCY_KEY" ? 400 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Não foi possível registrar a compra agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
