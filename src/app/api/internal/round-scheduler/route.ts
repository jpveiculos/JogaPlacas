import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { authPrisma } from "@/lib/auth/session";
import { closeRound } from "@/modules/rounds/close-round";
import { drawRoundResults } from "@/modules/rounds/draw-round-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIME_ZONE = "America/Sao_Paulo";
const HALF_HOUR_MS = 30 * 60_000;
const MINUTE_MS = 60_000;

function safeSecretMatch(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(`Bearer ${expected}`);
  return left.length === right.length && timingSafeEqual(left, right);
}

function saoPauloParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function wallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = target + 3 * 60 * MINUTE_MS;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = saoPauloParts(new Date(candidate));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    candidate += target - represented;
  }
  return new Date(candidate);
}

function resultSlots(from: Date, through: Date): Date[] {
  const slots: Date[] = [];
  const local = saoPauloParts(from);
  let cursor = wallTimeToUtc(Number(local.year), Number(local.month), Number(local.day), Number(local.hour), 0);
  if (cursor.getTime() < from.getTime()) cursor = new Date(cursor.getTime() + HALF_HOUR_MS);
  // Align to the next local :00 or :30 boundary, then iterate by 30 minutes.
  const currentParts = saoPauloParts(cursor);
  if (Number(currentParts.minute) === 0 && cursor.getTime() < from.getTime()) {
    cursor = new Date(cursor.getTime() + HALF_HOUR_MS);
  } else if (Number(currentParts.minute) !== 0) {
    cursor = new Date(cursor.getTime() + HALF_HOUR_MS);
  }
  while (cursor.getTime() <= through.getTime()) {
    slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + HALF_HOUR_MS);
  }
  return slots;
}

function roundCode(date: Date): string {
  const parts = saoPauloParts(date);
  return `JP-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

/**
 * Protected scheduler endpoint. Configure the hosting platform to call it every minute
 * with Authorization: Bearer <ROUND_SCHEDULER_SECRET>. It only manages scheduled rounds.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.ROUND_SCHEDULER_SECRET;
  if (!secret || !safeSecretMatch(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * MINUTE_MS);
  let created = 0;
  let closed = 0;
  let drawn = 0;
  let failures = 0;

  // Create a rolling 48-hour schedule. Unique round codes make retries idempotent.
  for (const resultAt of resultSlots(now, horizon)) {
    const code = roundCode(resultAt);
    try {
      const existing = await authPrisma.round.findUnique({ where: { code }, select: { id: true } });
      if (existing) continue;
      const previous = await authPrisma.round.findFirst({
        where: { resultAt: { lt: resultAt }, status: { not: "CANCELLED" } },
        orderBy: { resultAt: "desc" },
        select: { resultAt: true },
      });
      const startsAt = previous ? new Date(previous.resultAt.getTime() + MINUTE_MS) : new Date(resultAt.getTime() - HALF_HOUR_MS);
      const cutoffAt = new Date(resultAt.getTime() - MINUTE_MS);
      if (startsAt >= cutoffAt) continue;
      await authPrisma.$transaction(async (tx) => {
        const round = await tx.round.create({
          data: { code, startsAt, cutoffAt, resultAt, status: "SCHEDULED" },
          select: { id: true },
        });
        await tx.auditEvent.create({
          data: { action: "ROUND_SCHEDULED_AUTOMATICALLY", entityType: "Round", entityId: round.id,
            metadata: { code, startsAt: startsAt.toISOString(), cutoffAt: cutoffAt.toISOString(), resultAt: resultAt.toISOString(), timeZone: TIME_ZONE } },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      created += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      failures += 1;
    }
  }

  // Process closures before draws; both operations lock the round and are safe to retry.
  const dueToClose = await authPrisma.round.findMany({
    where: { status: { in: ["SCHEDULED", "OPEN"] }, cutoffAt: { lte: now } },
    select: { id: true }, orderBy: { cutoffAt: "asc" }, take: 100,
  });
  for (const round of dueToClose) {
    try { await closeRound(authPrisma, round.id); closed += 1; } catch { failures += 1; }
  }

  const dueToDraw = await authPrisma.round.findMany({
    where: { status: "CLOSED", resultAt: { lte: now } },
    select: { id: true }, orderBy: { resultAt: "asc" }, take: 100,
  });
  for (const round of dueToDraw) {
    try { await drawRoundResults(authPrisma, round.id); drawn += 1; } catch { failures += 1; }
  }

  return NextResponse.json({ ok: failures === 0, created, closed, drawn, failures, timeZone: TIME_ZONE }, {
    status: failures === 0 ? 200 : 207, headers: { "Cache-Control": "no-store" },
  });
}
