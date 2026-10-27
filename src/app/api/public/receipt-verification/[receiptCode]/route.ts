import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
type RouteContext = { params: Promise<{ receiptCode: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { receiptCode: rawCode } = await context.params;
  const receiptCode = rawCode.replace(/\s/g, "").toUpperCase();
  if (!/^JP-[A-Z0-9]{8,32}$/.test(receiptCode)) {
    return NextResponse.json({ valid: false, message: "Código de recibo inválido." }, { status: 400, headers });
  }

  try {
    const purchase = await authPrisma.purchase.findUnique({
      where: { receiptCode },
      select: {
        receiptCode: true,
        status: true,
        paymentMethod: true,
        totalCents: true,
        currency: true,
        confirmedAt: true,
        payment: { select: { status: true, confirmedAt: true } },
        participations: {
          where: { status: "CONFIRMED" },
          orderBy: { round: { resultAt: "asc" } },
          select: {
            round: {
              select: {
                code: true,
                status: true,
                startsAt: true,
                resultAt: true,
                resultLegacyPlate: true,
                resultMercosurPlate: true,
              },
            },
            lines: {
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              select: {
                plateDisplay: true,
                plateFormat: true,
                prizeCents: true,
                prizeCreditedAt: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ valid: false, message: "Este código não corresponde a um recibo registrado no Joga Placas." }, { status: 404, headers });
    }

    const paymentConfirmed = purchase.paymentMethod === "CASH"
      ? purchase.status === "CONFIRMED" && purchase.confirmedAt !== null
      : purchase.status === "CONFIRMED" && purchase.payment?.status === "CONFIRMED" && purchase.payment.confirmedAt !== null;

    if (!paymentConfirmed) {
      return NextResponse.json({
        valid: false,
        receiptCode: purchase.receiptCode,
        message: "O registro existe, mas o pagamento não está confirmado. Não aceite este documento como recibo pago.",
      }, { headers });
    }

    return NextResponse.json({
      valid: true,
      receiptCode: purchase.receiptCode,
      status: "CONFIRMED",
      paymentMethod: purchase.paymentMethod,
      totalCents: purchase.totalCents,
      currency: purchase.currency,
      confirmedAt: purchase.confirmedAt?.toISOString() ?? null,
      rounds: purchase.participations.map((participation) => {
        const round = participation.round;
        const completed = round.status === "COMPLETED";
        const now = Date.now();
        const roundStatus = round.status === "CANCELLED"
          ? "RODADA_CANCELADA"
          : completed
            ? "RESULTADO_PUBLICADO"
            : now < round.resultAt.getTime()
              ? "SORTEIO_AGUARDANDO"
              : "AGUARDANDO_RESULTADO_OFICIAL";
        return {
          roundCode: round.code,
          status: roundStatus,
          startsAt: round.startsAt.toISOString(),
          resultAt: round.resultAt.toISOString(),
          resultLegacyPlate: completed ? round.resultLegacyPlate : null,
          resultMercosurPlate: completed ? round.resultMercosurPlate : null,
          plates: participation.lines.map((line) => ({
            plateDisplay: line.plateDisplay,
            plateFormat: line.plateFormat,
            resultStatus: !completed
              ? "AGUARDANDO"
              : (line.prizeCents ?? 0) > 0
                ? "PREMIADA"
                : line.prizeCents === 0
                  ? "NAO_PREMIADA"
                  : "AGUARDANDO_APURACAO",
            prizeCents: completed && (line.prizeCents ?? 0) > 0 ? line.prizeCents : null,
            prizePaid: Boolean(line.prizeCreditedAt),
          })),
        };
      }),
      message: "Recibo registrado e pagamento confirmado no sistema oficial.",
    }, { headers });
  } catch {
    return NextResponse.json({ valid: false, message: "Não foi possível verificar agora. Tente novamente." }, { status: 500, headers });
  }
}
