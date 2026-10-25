import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCurrentPrizeRuleSnapshot, CURRENT_PRIZE_RULE_VERSION } from "@/domain/prize-rule-snapshot";
import { createPendingPixPurchase, PurchaseServiceError } from "@/modules/purchases/create-purchase";
import { authPrisma, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lineSchema = z.object({
  plateDisplay: z.string().trim().min(1).max(16),
  stakeCents: z.number().int().safe().min(100).max(2_000_000_000),
}).strict();

const requestSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(200),
  roundIds: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
  lines: z.array(lineSchema).min(1).max(100),
}).strict();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }

  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "É necessário entrar na conta." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (user.role !== "PLAYER" || user.mustChangePassword) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success || new Set(parsed.data?.roundIds ?? []).size !== (parsed.data?.roundIds.length ?? 0)) {
    return NextResponse.json({ error: "Informe rodadas distintas, placas válidas e valores em centavos." }, { status: 400 });
  }

  const snapshot = createCurrentPrizeRuleSnapshot();
  const receiptCode = `JP-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
  try {
    const purchase = await createPendingPixPurchase(authPrisma, {
      idempotencyKey: parsed.data.idempotencyKey,
      receiptCode,
      playerId: user.id,
      repetitions: parsed.data.roundIds.length,
      participations: parsed.data.roundIds.map((roundId) => ({
        roundId,
        lines: parsed.data.lines.map((line) => ({
          plateDisplay: line.plateDisplay,
          stakeCents: line.stakeCents,
          ruleVersion: CURRENT_PRIZE_RULE_VERSION,
          ruleSnapshot: snapshot,
        })),
      })),
    });

    return NextResponse.json({
      purchase: {
        id: purchase.id,
        receiptCode: purchase.receiptCode,
        status: purchase.status,
        paymentStatus: purchase.payment?.status ?? "PENDING",
        totalCents: purchase.totalCents,
        currency: purchase.currency,
        participations: purchase.participations.map((participation) => ({
          roundId: participation.roundId,
          totalCents: participation.totalCents,
          lines: participation.lines.map((line) => ({
            plateDisplay: line.plateDisplay,
            totalCents: line.unitCents + line.tensCents + line.hundredsCents
              + line.thousandsCents + line.lettersCents + line.fullPlateCents,
            allocationCents: {
              unit: line.unitCents,
              tens: line.tensCents,
              hundreds: line.hundredsCents,
              thousands: line.thousandsCents,
              letters: line.lettersCents,
              fullPlate: line.fullPlateCents,
            },
          })),
        })),
      },
      paymentActionRequired: true,
      message: "Compra registrada como pendente. Nenhuma cobrança Pix foi criada ou confirmada por esta etapa.",
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PurchaseServiceError) {
      const status = error.code === "INVALID_ACTOR" ? 403
        : error.code === "IDEMPOTENCY_CONFLICT" ? 409
          : error.code === "ROUND_UNAVAILABLE" ? 409
            : error.code === "INVALID_IDEMPOTENCY_KEY" ? 400 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Não foi possível registrar a compra agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
