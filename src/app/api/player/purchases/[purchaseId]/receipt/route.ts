import { NextRequest, NextResponse } from "next/server";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };

type RouteContext = { params: Promise<{ purchaseId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers });
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Altere sua senha antes de continuar." }, { status: 403, headers });
  }

  const { purchaseId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(purchaseId)) {
    return NextResponse.json({ error: "Compra não encontrada." }, { status: 404, headers });
  }

  try {
    const purchase = await authPrisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        createdAt: true,
        playerId: true,
        cashierId: true,
        status: true,
        paymentMethod: true,
        totalCents: true,
        currency: true,
        customer: { select: { name: true } },
        receiptCode: true,
        confirmedAt: true,
        payment: { select: { status: true, confirmedAt: true } },
        participations: {
          where: { status: "CONFIRMED" },
          orderBy: { round: { resultAt: "asc" } },
          select: {
            round: { select: { code: true, resultAt: true } },
            lines: {
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              select: {
                plateDisplay: true,
                plateFormat: true,
                unitCents: true,
                tensCents: true,
                hundredsCents: true,
                thousandsCents: true,
                lettersCents: true,
                fullPlateCents: true,
              },
            },
          },
        },
      },
    });

    // Return the same response for missing and unauthorized purchases to avoid ID enumeration.
    const ownsPurchase = user.role === "ADMIN"
      || (user.role === "PLAYER" && purchase?.playerId === user.id)
      || (user.role === "CASHIER" && purchase?.cashierId === user.id);
    if (!purchase || !ownsPurchase) {
      return NextResponse.json({ error: "Compra não encontrada." }, { status: 404, headers });
    }

    const retentionDeadline = purchase.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000;
    if (Date.now() >= retentionDeadline) {
      return NextResponse.json({ error: "O prazo de validade de 7 dias deste recibo terminou. Não é mais possível consultá-lo ou imprimi-lo." }, { status: 410, headers });
    }

    const isCashSale = purchase.paymentMethod === "CASH";
    const isWalletSale = purchase.paymentMethod === "WALLET";
    if (purchase.status !== "CONFIRMED"
      || (!isCashSale && !isWalletSale && (purchase.payment?.status !== "CONFIRMED" || !purchase.payment.confirmedAt))
      || !purchase.receiptCode
      || !purchase.confirmedAt) {
      return NextResponse.json({ error: "O recibo oficial estará disponível após a confirmação do pagamento." }, { status: 409, headers });
    }

    const plates = purchase.participations.flatMap((participation) =>
      participation.lines.map((line) => ({
        plateDisplay: line.plateDisplay,
        plateFormat: line.plateFormat,
        roundCode: participation.round.code,
        resultAt: participation.round.resultAt.toISOString(),
        stakeCents: line.unitCents + line.tensCents + line.hundredsCents
          + line.thousandsCents + line.lettersCents + line.fullPlateCents,
      })),
    );

    return NextResponse.json({
      receipt: {
        purchaseId: purchase.id,
        receiptCode: purchase.receiptCode,
        paymentStatus: "CONFIRMED",
        issuedAt: purchase.confirmedAt.toISOString(),
        paymentMethod: purchase.paymentMethod,
        totalCents: purchase.totalCents,
        currency: purchase.currency,
        customerLabel: purchase.customer?.name ?? null,
        plates,
      },
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o recibo agora." }, { status: 500, headers });
  }
}
