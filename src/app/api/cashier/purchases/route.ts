import { NextRequest, NextResponse } from "next/server";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers });
  if (user.role !== "CASHIER" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toUpperCase().replace(/\\s+/g, "");
  const receiptCode = query;
  const compactPlate = query.replaceAll("-", "");
  const isReceiptCode = /^JP-[A-Z0-9]{8,32}$/.test(receiptCode);
  const isLegacyPlate = /^[A-Z]{3}-?\\d{4}$/.test(query);
  const isMercosurPlate = /^[A-Z]{3}\\d[A-Z]\\d{2}$/.test(compactPlate);
  if (!isReceiptCode && !isLegacyPlate && !isMercosurPlate) {
    return NextResponse.json({
      purchases: [],
      message: "Digite o código completo do recibo (JP-...) ou uma placa completa, cinza ou Mercosul.",
    }, { headers });
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const where = {
      cashierId: user.id,
      createdAt: { gte: since },
      ...(isReceiptCode
        ? { receiptCode }
        : { participations: { some: { lines: { some: { normalizedPlate: compactPlate } } } } }),
    };
    const purchases = await authPrisma.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        totalCents: true,
        currency: true,
        receiptCode: true,
        createdAt: true,
        confirmedAt: true,
        payment: { select: { status: true, providerStatus: true, providerStatusDetail: true, confirmedAt: true } },
        participations: {
          select: { lines: { select: { plateDisplay: true, normalizedPlate: true } } },
        },
      },
    });

    const matches = purchases.map((purchase) => ({
      id: purchase.id,
      status: purchase.status,
      paymentMethod: purchase.paymentMethod,
      paymentStatus: purchase.payment?.status ?? "PENDING",
      providerStatus: purchase.payment?.providerStatus ?? null,
      providerStatusDetail: purchase.payment?.providerStatusDetail ?? null,
      totalCents: purchase.totalCents,
      currency: purchase.currency,
      receiptCode: purchase.receiptCode,
      createdAt: purchase.createdAt.toISOString(),
      confirmedAt: purchase.confirmedAt?.toISOString() ?? null,
      plates: [...new Set(purchase.participations.flatMap((part) => part.lines.map((line) => line.plateDisplay)))],
      receiptReady: purchase.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000 > Date.now()
        && purchase.status === "CONFIRMED"
        && purchase.payment?.status === "CONFIRMED"
        && Boolean(purchase.receiptCode && purchase.confirmedAt && purchase.payment.confirmedAt),
    }));
    return NextResponse.json({
      purchases: matches,
      message: matches.length === 0
        ? "Nenhuma compra desta conta foi encontrada nos últimos 7 dias. Confira a placa ou o código do recibo."
        : isReceiptCode ? "Compra localizada pelo código do recibo." : "Confira a data, o valor e as placas para identificar a compra correta.",
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível localizar a compra agora." }, { status: 500, headers });
  }
}
