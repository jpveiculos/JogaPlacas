import { NextResponse } from "next/server";
import { authPrisma } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rounds = await authPrisma.round.findMany({
      where: {
        status: "COMPLETED",
        resultAt: { gte: since },
        resultLegacyPlate: { not: null },
        resultMercosurPlate: { not: null },
      },
      select: {
        id: true,
        code: true,
        resultAt: true,
        resultLegacyPlate: true,
        resultMercosurPlate: true,
      },
      orderBy: { resultAt: "desc" },
      take: 10,
    });
    return NextResponse.json({
      results: rounds.map((round) => ({
        id: round.id,
        code: round.code,
        resultAt: round.resultAt!.toISOString(),
        legacyPlate: round.resultLegacyPlate!,
        mercosurPlate: round.resultMercosurPlate!,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar os resultados agora." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
