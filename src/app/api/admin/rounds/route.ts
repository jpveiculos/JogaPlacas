import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (user.role !== "ADMIN" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const [rounds, pendingPayments, confirmedPurchases] = await Promise.all([
      authPrisma.round.findMany({
        select: {
          id: true, code: true, startsAt: true, cutoffAt: true, resultAt: true, status: true,
          resultLegacyPlate: true, resultMercosurPlate: true,
          _count: { select: { participations: true } },
        },
        orderBy: [{ startsAt: "desc" }, { code: "desc" }],
        take: 100,
      }),
      authPrisma.purchase.count({ where: { status: "PENDING_PAYMENT" } }),
      authPrisma.purchase.count({ where: { status: "CONFIRMED" } }),
    ]);
    return NextResponse.json({
      rounds: rounds.map((round) => ({
        id: round.id, code: round.code, startsAt: round.startsAt.toISOString(),
        cutoffAt: round.cutoffAt.toISOString(), resultAt: round.resultAt.toISOString(),
        status: round.status, resultLegacyPlate: round.resultLegacyPlate,
        resultMercosurPlate: round.resultMercosurPlate, participationCount: round._count.participations,
      })),
      summary: { pendingPayments, confirmedPurchases },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o painel administrativo." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

const createRoundSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  resultAt: z.string().datetime({ offset: true }),
}).strict();

function roundCodeFor(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `JP-${value.year}${value.month}${value.day}-${value.hour}${value.minute}`;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (user.role !== "ADMIN" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  let payload: unknown;
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const parsed = createRoundSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Informe os horários de início e resultado válidos." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const startsAt = new Date(parsed.data.startsAt);
  const resultAt = new Date(parsed.data.resultAt);
  const cutoffAt = new Date(resultAt.getTime() - 60_000);
  const now = Date.now();
  if (startsAt.getTime() <= now || resultAt.getTime() <= now || resultAt.getTime() - startsAt.getTime() !== 30 * 60_000) {
    return NextResponse.json({ error: "A rodada deve começar no futuro e ter resultado exatamente 30 minutos após o início." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const code = roundCodeFor(resultAt);
  try {
    const round = await authPrisma.$transaction(async (tx) => {
      const created = await tx.round.create({
        data: { code, startsAt, cutoffAt, resultAt, status: "SCHEDULED" },
        select: { id: true, code: true, startsAt: true, cutoffAt: true, resultAt: true, status: true },
      });
      await tx.auditEvent.create({ data: {
        actorId: user.id, action: "ROUND_CREATED", entityType: "Round", entityId: created.id,
        metadata: { code, startsAt: startsAt.toISOString(), cutoffAt: cutoffAt.toISOString(), resultAt: resultAt.toISOString(), timeZone: "America/Sao_Paulo" },
      } });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ created: true, round: {
      ...round, startsAt: round.startsAt.toISOString(), cutoffAt: round.cutoffAt.toISOString(), resultAt: round.resultAt.toISOString(),
    } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma rodada nesse horário. Escolha outro horário." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Não foi possível criar a rodada." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
