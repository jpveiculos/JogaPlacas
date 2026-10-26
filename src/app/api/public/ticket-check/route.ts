import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@/lib/auth/session";
import type { PlateFormat, RoundStatus } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store, public, max-age=0" };
type LineResult = {
  id: string;
  plateFormat: PlateFormat;
  plateDisplay: string;
  prizeCents: number | null;
  prizeCreditedAt: Date | null;
  participation: {
    round: {
      code: string;
      status: RoundStatus;
      resultAt: Date;
      resultLegacyPlate: string | null;
      resultMercosurPlate: string | null;
    };
  };
};

function getLineStatus(line: LineResult, roundStatus: RoundStatus, manualClaimDeadlineApplies: boolean) {
  if (line.prizeCents !== null && line.prizeCents > 0 && line.prizeCreditedAt) return "PREMIADA";
  if (manualClaimDeadlineApplies && (line.prizeCents ?? 0) > 0 && Date.now() >= line.participation.round.resultAt.getTime() + 7 * 24 * 60 * 60 * 1000) return "PRAZO_EXPIRADO";
  if (roundStatus !== "COMPLETED") return "AGUARDANDO_RESULTADO";
  if (line.prizeCents === 0) return "NAO_PREMIADA";
  return "AGUARDANDO_APURACAO";
}

function toSafeResult(line: LineResult, manualClaimDeadlineApplies: boolean) {
  const round = line.participation.round;
  return {
    id: line.id,
    plateFormat: line.plateFormat,
    plateDisplay: line.plateDisplay,
    roundCode: round.code,
    resultAt: round.resultAt.toISOString(),
    roundStatus: round.status,
    resultLegacyPlate: round.resultLegacyPlate,
    resultMercosurPlate: round.resultMercosurPlate,
    status: getLineStatus(line, round.status, manualClaimDeadlineApplies),
    prizeCents: line.prizeCreditedAt && (line.prizeCents ?? 0) > 0 ? line.prizeCents : null,
  };
}

export async function GET(request: NextRequest) {
  const normalizedCode = (request.nextUrl.searchParams.get("q") ?? "").replace(/\s/g, "").toUpperCase();
  if (!/^JP-[A-Z0-9]{8,32}$/.test(normalizedCode)) {
    return NextResponse.json({ error: "Digite o código completo do recibo iniciado por JP-." }, { status: 400, headers });
  }

  try {
    const purchase = await authPrisma.purchase.findUnique({
      where: { receiptCode: normalizedCode },
      select: {
        status: true,
        playerId: true,
        createdAt: true,
        participations: {
          where: { status: "CONFIRMED" },
          select: {
            round: { select: { code: true, status: true, resultAt: true, resultLegacyPlate: true, resultMercosurPlate: true } },
            lines: { select: { id: true, plateFormat: true, plateDisplay: true, prizeCents: true, prizeCreditedAt: true } },
          },
          orderBy: { round: { resultAt: "desc" } },
        },
      },
    });

    if (!purchase || purchase.status !== "CONFIRMED") {
      return NextResponse.json({ found: false, results: [], message: "Não encontramos um recibo confirmado com esse código. Confira e tente novamente." }, { headers });
    }

    if (Date.now() >= purchase.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ found: false, results: [], message: "O prazo de validade de 7 dias deste recibo terminou. A consulta pública não está mais disponível." }, { headers });
    }

    const results = purchase.participations.flatMap((participation) =>
      participation.lines.map((line) => toSafeResult({ ...line, participation: { round: participation.round } }, purchase.playerId === null)),
    );
    return NextResponse.json({
      found: true,
      searchType: "RECIBO",
      results,
      message: results.length ? "Confira abaixo cada placa e seu resultado." : "Este recibo não possui placas confirmadas para consulta.",
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar agora. Tente novamente." }, { status: 500, headers });
  }
}
