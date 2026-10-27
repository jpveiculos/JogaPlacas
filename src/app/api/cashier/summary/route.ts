import { NextRequest, NextResponse } from "next/server";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers });
  if (user.role !== "CASHIER" || user.mustChangePassword) return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers });

  try {
    const [sales, commission] = await Promise.all([
      authPrisma.purchase.aggregate({
        where: { cashierId: user.id, status: "CONFIRMED" },
        _sum: { totalCents: true },
        _count: { _all: true },
      }),
      authPrisma.cashierCommission.aggregate({
        where: { cashierId: user.id, purchase: { status: "CONFIRMED" } },
        _sum: { amountCents: true },
      }),
    ]);
    const profile = await authPrisma.user.findUnique({
      where: { id: user.id },
      select: { commissionRateBasisPoints: true },
    });
    return NextResponse.json({
      totalSalesCents: sales._sum.totalCents ?? 0,
      confirmedSalesCount: sales._count._all,
      commissionCents: commission._sum.amountCents ?? 0,
      commissionRateBasisPoints: profile?.commissionRateBasisPoints ?? 0,
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o resumo das vendas e comissões." }, { status: 500, headers });
  }
}
