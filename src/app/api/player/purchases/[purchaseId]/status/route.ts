import { NextRequest, NextResponse } from "next/server";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

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
      status: true,
      receiptCode: true,
      confirmedAt: true,
      payment: { select: { status: true, providerStatus: true, providerStatusDetail: true, confirmedAt: true } },
    },
  });
  if (!purchase) return NextResponse.json({ error: "Compra não encontrada." }, { status: 404, headers });

  const confirmed = purchase.status === "CONFIRMED"
    && purchase.payment?.status === "CONFIRMED"
    && Boolean(purchase.receiptCode && purchase.confirmedAt && purchase.payment.confirmedAt);

  return NextResponse.json({
    purchaseStatus: purchase.status,
    paymentStatus: purchase.payment?.status ?? "PENDING",
    providerStatus: purchase.payment?.providerStatus ?? null,
    providerStatusDetail: purchase.payment?.providerStatusDetail ?? null,
    receiptReady: confirmed,
  }, { headers });
}
