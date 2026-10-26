import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { calculateLinePrizeCents, RoundSettlementError } from "@/modules/rounds/settle-round-prizes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };
const DAY = 24 * 60 * 60 * 1000;

async function adminFromRequest(request: NextRequest) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return { response: NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers }) };
  if (user.role !== "ADMIN" || user.mustChangePassword) {
    return { response: NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers }) };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await adminFromRequest(request);
  if (auth.response) return auth.response;
  try {
    const lines = await authPrisma.participationLine.findMany({
      where: {
        prizeCents: { gt: 0 },
        prizeCreditedAt: null,
        participation: { is: {
          status: "CONFIRMED",
          round: { is: { status: "COMPLETED", resultLegacyPlate: { not: null }, resultMercosurPlate: { not: null } } },
          purchase: { is: { status: "CONFIRMED", playerId: { not: null } } },
        } },
      },
      select: {
        id: true, plateDisplay: true, plateFormat: true, prizeCents: true, createdAt: true,
        participation: { select: {
          id: true,
          round: { select: { id: true, code: true, resultAt: true, resultLegacyPlate: true, resultMercosurPlate: true } },
          purchase: { select: { id: true, createdAt: true, playerId: true, player: { select: { id: true, username: true } } } },
        } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 200,
    });
    const items = await Promise.all(lines.map(async (line) => {
      const entry = await authPrisma.ledgerEntry.findUnique({ where: { idempotencyKey: "prize-credit:" + line.id } });
      return {
        lineId: line.id,
        plate: line.plateDisplay,
        plateFormat: line.plateFormat,
        prizeCents: line.prizeCents,
        roundCode: line.participation.round.code,
        resultAt: line.participation.round.resultAt.toISOString(),
        purchaseCreatedAt: line.participation.purchase.createdAt.toISOString(),
        playerId: line.participation.purchase.playerId,
        username: line.participation.purchase.player?.username ?? "Conta indisponível",
        ledgerEntryExists: Boolean(entry),
        ledgerMatches: Boolean(entry &&
          entry.userId === line.participation.purchase.playerId &&
          entry.amountCents === line.prizeCents &&
          entry.type === "PRIZE_CREDIT" &&
          entry.participationId === line.participation.id),
      };
    }));
    return NextResponse.json({ items, count: items.length, limit: 200 }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os créditos pendentes." }, { status: 500, headers });
  }
}

const repairSchema = z.object({
  lineId: z.string().min(1).max(128),
  reason: z.string().trim().min(8).max(500),
}).strict();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403, headers });
  }
  const auth = await adminFromRequest(request);
  if (auth.response) return auth.response;
  let payload: unknown;
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400, headers });
  }
  const parsed = repairSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe a linha do prêmio e um motivo com pelo menos 8 caracteres." }, { status: 400, headers });
  }

  try {
    const result = await authPrisma.$transaction(async (tx) => {
      const line = await tx.participationLine.findUnique({
        where: { id: parsed.data.lineId },
        include: { participation: { include: { round: true, purchase: { include: { player: true } } } } },
      });
      if (!line) throw new Error("LINE_NOT_FOUND");
      const purchase = line.participation.purchase;
      const round = line.participation.round;
      const playerId = purchase.playerId;
      if (!playerId || !purchase.player || purchase.status !== "CONFIRMED" ||
          line.participation.status !== "CONFIRMED" || round.status !== "COMPLETED" ||
          !round.resultLegacyPlate || !round.resultMercosurPlate) throw new Error("NOT_ELIGIBLE");
      if (line.prizeCents === null || line.prizeCents <= 0) throw new Error("NO_PRIZE");
      const recalculated = calculateLinePrizeCents({
        plateFormat: line.plateFormat,
        normalizedPlate: line.normalizedPlate,
        unitCents: line.unitCents,
        tensCents: line.tensCents,
        hundredsCents: line.hundredsCents,
        thousandsCents: line.thousandsCents,
        lettersCents: line.lettersCents,
        fullPlateCents: line.fullPlateCents,
        ruleVersion: line.ruleVersion,
        ruleSnapshot: line.ruleSnapshot,
      }, round.resultLegacyPlate, round.resultMercosurPlate);
      if (recalculated <= 0 || recalculated !== line.prizeCents) throw new Error("PRIZE_MISMATCH");

      const idempotencyKey = "prize-credit:" + line.id;
      const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
      let creditedNow = false;
      if (existing) {
        if (existing.userId !== playerId || existing.amountCents !== recalculated ||
            existing.type !== "PRIZE_CREDIT" || existing.participationId !== line.participationId) {
          throw new Error("LEDGER_CONFLICT");
        }
      } else {
        await tx.ledgerEntry.create({ data: {
          userId: playerId,
          purchaseId: purchase.id,
          participationId: line.participationId,
          type: "PRIZE_CREDIT",
          amountCents: recalculated,
          currency: purchase.currency,
          idempotencyKey,
          description: "Crédito corretivo de prêmio da rodada " + round.code + " — linha " + line.id,
        } });
        creditedNow = true;
      }
      if (!line.prizeCreditedAt) {
        await tx.participationLine.update({ where: { id: line.id }, data: { prizeCreditedAt: new Date() } });
      }
      await tx.auditEvent.create({ data: {
        actorId: auth.user.id,
        action: creditedNow ? "PLAYER_PRIZE_CREDIT_REPAIRED" : "PLAYER_PRIZE_CREDIT_RECONCILED",
        entityType: "ParticipationLine",
        entityId: line.id,
        metadata: {
          playerId, username: purchase.player.username, purchaseId: purchase.id,
          participationId: line.participationId, roundId: round.id, roundCode: round.code,
          prizeCents: recalculated, idempotencyKey, reason: parsed.data.reason,
          originalResultAt: round.resultAt.toISOString(), originalPurchaseCreatedAt: purchase.createdAt.toISOString(),
          creditedNow,
        },
      } });
      return { player: purchase.player.username, roundCode: round.code, prizeCents: recalculated, creditedNow };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    if (error instanceof RoundSettlementError) {
      return NextResponse.json({ error: "Não foi possível validar o prêmio para correção." }, { status: 409, headers });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "O crédito já existe; atualize a lista para reconciliar o registro." }, { status: 409, headers });
    }
    const code = error instanceof Error ? error.message : "";
    if (code === "LINE_NOT_FOUND") return NextResponse.json({ error: "Prêmio não encontrado." }, { status: 404, headers });
    if (code === "NOT_ELIGIBLE") return NextResponse.json({ error: "Este registro não é elegível para crédito corretivo de prêmio online." }, { status: 409, headers });
    if (code === "NO_PRIZE") return NextResponse.json({ error: "A linha não possui prêmio positivo apurado." }, { status: 409, headers });
    if (code === "PRIZE_MISMATCH" || code === "LEDGER_CONFLICT") return NextResponse.json({ error: "Divergência financeira detectada. O crédito foi bloqueado para auditoria." }, { status: 409, headers });
    return NextResponse.json({ error: "Não foi possível realizar a correção do crédito." }, { status: 500, headers });
  }
}
