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

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) {
    return NextResponse.json({ purchases: [], message: "Digite pelo menos 2 caracteres para pesquisar." }, { headers });
  }

  try {
    const where = {
      cashierId: user.id,
      OR: [
        { id: query },
        { receiptCode: { contains: query, mode: "insensitive" as const } },
        { customer: { is: { name: { contains: query, mode: "insensitive" as const } } } },
        { customer: { is: { phone: { contains: query } } } },
        { participations: { some: { lines: { some: { plateDisplay: { contains: query, mode: "insensitive" as const } } } } } },
      ],
    };
    const purchases = await authPrisma.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        totalCents: true,
        currency: true,
        receiptCode: true,
        createdAt: true,
        confirmedAt: true,
        customer: { select: { name: true, phone: true } },
        payment: { select: { status: true, providerStatus: true, providerStatusDetail: true, confirmedAt: true } },
        participations: {
          select: { lines: { select: { plateDisplay: true } } },
        },
      },
    });

    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
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
        customerName: purchase.customer?.name ?? null,
        customerPhone: purchase.customer?.phone ?? null,
        plates: [...new Set(purchase.participations.flatMap((part) => part.lines.map((line) => line.plateDisplay)))],
        receiptReady: purchase.status === "CONFIRMED"
          && purchase.payment?.status === "CONFIRMED"
          && Boolean(purchase.receiptCode && purchase.confirmedAt && purchase.payment.confirmedAt),
      })),
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível pesquisar as compras agora." }, { status: 500, headers });
  }
}
