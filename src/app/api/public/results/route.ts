import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const WINNER_LIMIT = 12;
const WINNER_WINDOW_DAYS = 30;

function maskUsername(username: string): string {
  if (username.length <= 2) return username.slice(0, 1) + "•";
  return username.slice(0, 2) + "•••";
}

export async function GET(request: NextRequest) {
  try {
    const beforeParam = request.nextUrl.searchParams.get("before");
    let before: Date | undefined;
    if (beforeParam !== null) {
      before = new Date(beforeParam);
      if (Number.isNaN(before.getTime())) {
        return NextResponse.json({ error: "Cursor de histórico inválido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }
    }
    const where = {
      status: "COMPLETED" as const,
      resultLegacyPlate: { not: null },
      resultMercosurPlate: { not: null },
      ...(before ? { resultAt: { lt: before } } : {}),
    };
    const [rounds, winnerLines] = await Promise.all([
      authPrisma.round.findMany({
        where,
        select: { id: true, code: true, resultAt: true, resultLegacyPlate: true, resultMercosurPlate: true },
        orderBy: [{ resultAt: "desc" }, { id: "desc" }],
        take: PAGE_SIZE + 1,
      }),
      before ? Promise.resolve([]) : authPrisma.participationLine.findMany({
        where: {
          prizeCents: { gt: 0 },
          prizeCreditedAt: { not: null },
          participation: { is: {
            status: "CONFIRMED",
            purchase: { is: { status: "CONFIRMED" } },
            round: { is: { status: "COMPLETED", resultAt: { gte: new Date(Date.now() - WINNER_WINDOW_DAYS * 24 * 60 * 60 * 1000) } } },
          } },
        },
        select: {
          id: true, plateFormat: true, plateDisplay: true, prizeCents: true,
          participation: { select: {
            round: { select: { code: true, resultAt: true } },
            purchase: { select: { player: { select: { username: true } } } },
          } },
        },
        orderBy: [{ prizeCreditedAt: "desc" }, { id: "desc" }],
        take: WINNER_LIMIT,
      }),
    ]);
    const hasMore = rounds.length > PAGE_SIZE;
    const page = hasMore ? rounds.slice(0, PAGE_SIZE) : rounds;
    const last = page.at(-1);
    return NextResponse.json({
      results: page.map((round) => ({
        id: round.id, code: round.code, resultAt: round.resultAt.toISOString(),
        legacyPlate: round.resultLegacyPlate!, mercosurPlate: round.resultMercosurPlate!,
      })),
      nextBefore: hasMore && last ? last.resultAt.toISOString() : null,
      winners: winnerLines.map((line) => ({
        id: line.id,
        displayName: line.participation.purchase.player?.username
          ? maskUsername(line.participation.purchase.player.username)
          : "Ganhador",
        plateFormat: line.plateFormat,
        plateDisplay: line.plateDisplay,
        prizeCents: line.prizeCents!,
        roundCode: line.participation.round.code,
        resultAt: line.participation.round.resultAt.toISOString(),
      })),
      winnersWindowDays: WINNER_WINDOW_DAYS,
      generatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store, public, max-age=0" } });
  } catch (error) {
    console.error("[public-results] Failed to load public results", error);
    return NextResponse.json({ error: "Não foi possível carregar os resultados agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
