import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { createPendingPixPurchase, type PixPurchaseInput } from "./create-purchase";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1";
const suite = enabled ? describe : describe.skip;

suite("PostgreSQL purchase concurrency", () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when RUN_POSTGRES_INTEGRATION=1");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  const suffix = randomUUID();
  const playerId = `it-player-${suffix}`;
  const roundId = `it-round-${suffix}`;
  const fixedNow = new Date("2035-01-01T12:00:00.000Z");

  const input = (idempotencyKey: string, receiptCode: string): PixPurchaseInput => ({
    idempotencyKey,
    receiptCode,
    playerId,
    repetitions: 1,
    participations: [{
      roundId,
      lines: [{
        plateDisplay: "ABC-1234",
        unitCents: 100,
        tensCents: 0,
        hundredsCents: 0,
        thousandsCents: 0,
        lettersCents: 0,
        fullPlateCents: 0,
        ruleVersion: "integration-v1",
        ruleSnapshot: { version: "integration-v1" },
      }],
    }],
  });

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: playerId, username: playerId, passwordHash: "integration-test-only" },
    });
    await prisma.round.create({
      data: {
        id: roundId,
        code: `IT-${suffix}`,
        startsAt: new Date("2035-01-01T13:00:00.000Z"),
        cutoffAt: new Date("2035-01-01T12:30:00.000Z"),
        resultAt: new Date("2035-01-01T14:00:00.000Z"),
        status: "OPEN",
      },
    });
  });

  afterAll(async () => {
    await prisma.participationLine.deleteMany({
      where: { participation: { roundId } },
    });
    await prisma.payment.deleteMany({
      where: { purchase: { participations: { some: { roundId } } } },
    });
    await prisma.purchaseParticipation.deleteMany({ where: { roundId } });
    await prisma.purchase.deleteMany({ where: { playerId } });
    await prisma.round.deleteMany({ where: { id: roundId } });
    await prisma.user.deleteMany({ where: { id: playerId } });
    await prisma.$disconnect();
  });

  it("persists exactly one purchase and payment for concurrent identical requests", async () => {
    const key = `it-same-${suffix}`;
    const request = input(key, `IT-RECEIPT-SAME-${suffix}`);
    const results = await Promise.all([
      createPendingPixPurchase(prisma, request, fixedNow),
      createPendingPixPurchase(prisma, request, fixedNow),
    ]);

    expect(results[0]!.id).toBe(results[1]!.id);
    expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
    expect(await prisma.purchaseParticipation.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
    expect(await prisma.participationLine.count({ where: { participation: { purchase: { idempotencyKey: key } } } })).toBe(1);
  });

  it("rejects concurrent requests with the same key but different receipt codes", async () => {
    const key = `it-conflict-${suffix}`;
    const outcomes = await Promise.allSettled([
      createPendingPixPurchase(prisma, input(key, `IT-RECEIPT-A-${suffix}`), fixedNow),
      createPendingPixPurchase(prisma, input(key, `IT-RECEIPT-B-${suffix}`), fixedNow),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    }
    expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
  });
});
