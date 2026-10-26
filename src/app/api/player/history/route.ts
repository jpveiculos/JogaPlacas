import { NextRequest, NextResponse } from "next/server";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  const headers = { "Cache-Control": "no-store, private" };
  if (!user) return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers });
  if (user.role !== "PLAYER" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers });
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const purchases = await authPrisma.purchase.findMany({
      where: { playerId: user.id, createdAt: { gte: since } },
      select: {
        id: true, receiptCode: true, status: true, createdAt: true, totalCents: true,
        participations: {
          select: {
            id: true, status: true, totalCents: true,
            round: { select: { code: true, status: true, resultAt: true, resultLegacyPlate: true, resultMercosurPlate: true } },
            lines: { select: { id: true, plateFormat: true, plateDisplay: true, prizeCents: true, prizeCreditedAt: true } },
          },
          orderBy: { round: { resultAt: "desc" } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const history = purchases.map((purchase) => ({
      id: purchase.id,
      receiptCode: purchase.status === "CONFIRMED" ? purchase.receiptCode : null,
      purchaseStatus: purchase.status,
      createdAt: purchase.createdAt.toISOString(),
      totalCents: purchase.totalCents,
      participations: purchase.participations.map((participation) => ({
        id: participation.id,
        status: participation.status,
        totalCents: participation.totalCents,
        roundCode: participation.round.code,
        roundStatus: participation.round.status,
        resultAt: participation.round.resultAt.toISOString(),
        resultLegacyPlate: participation.round.resultLegacyPlate,
        resultMercosurPlate: participation.round.resultMercosurPlate,
        lines: participation.lines.map((line) => {
          const credited = line.prizeCreditedAt !== null && (line.prizeCents ?? 0) > 0;
          let resultStatus: "PREMIADA" | "NAO_PREMIADA" | "AGUARDANDO_RESULTADO" | "AGUARDANDO_APURACAO" | "COMPRA_PENDENTE" | "PRAZO_EXPIRADO";
          if (purchase.status !== "CONFIRMED" || participation.status !== "CONFIRMED") resultStatus = "COMPRA_PENDENTE";
          else if (credited) resultStatus = "PREMIADA";
          else if ((line.prizeCents ?? 0) > 0 && Date.now() >= participation.round.resultAt.getTime() + 7 * 24 * 60 * 60 * 1000) resultStatus = "PRAZO_EXPIRADO";
          else if (participation.round.status !== "COMPLETED") resultStatus = "AGUARDANDO_RESULTADO";
          else if (line.prizeCents === 0) resultStatus = "NAO_PREMIADA";
          else resultStatus = "AGUARDANDO_APURACAO";
          return {
            id: line.id,
            plateFormat: line.plateFormat,
            plateDisplay: line.plateDisplay,
            resultStatus,
            prizeCents: credited ? line.prizeCents : null,
          };
        }),
      })),
    }));

    return NextResponse.json({ history }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar seu histórico agora." }, { status: 500, headers });
  }
}
