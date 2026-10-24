import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { createPendingPixPurchase, type PixPurchaseInput } from "./create-purchase";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1";
const suite = enabled ? describe : describe.skip;

suite("PostgreSQL purchase concurrency", () => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (enabled && !databaseUrl) {
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

  it("rolls back purchase and participation records when payment creation fails", async () => {
    const key = `it-rollback-${suffix}`;
    const triggerName = `it_fail_payment_${suffix.replaceAll("-", "")}`;
    const functionName = `it_fail_payment_fn_${suffix.replaceAll("-", "")}`;

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION "${functionName}"() RETURNS trigger AS $function$
      BEGIN
        RAISE EXCEPTION 'injected payment insert failure for integration test';
      END;
      $function$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON "Payment"
      FOR EACH ROW EXECUTE FUNCTION "${functionName}"()
    `);

    try {
      await expect(
        createPendingPixPurchase(prisma, input(key, `IT-RECEIPT-ROLLBACK-${suffix}`), fixedNow),
      ).rejects.toThrow();

      expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(0);
      expect(await prisma.payment.count({ where: { idempotencyKey: `pix-payment:${key}` } })).toBe(0);
      expect(await prisma.purchaseParticipation.count({ where: { purchase: { idempotencyKey: key } } })).toBe(0);
      expect(await prisma.participationLine.count({ where: { participation: { purchase: { idempotencyKey: key } } } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "Payment"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
    }
  });


  it("returns the existing purchase on retry after a simulated client timeout", async () => {
    const key = `it-timeout-retry-${suffix}`;
    const request = input(key, `IT-RECEIPT-TIMEOUT-${suffix}`);

    // The first request commits in PostgreSQL, but the client behaves as if it
    // did not receive the response. Retrying the same payload/key must replay it.
    const first = await createPendingPixPurchase(prisma, request, fixedNow);
    const retry = await createPendingPixPurchase(prisma, request, fixedNow);

    expect(retry.id).toBe(first.id);
    expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
    expect(await prisma.purchaseParticipation.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
    expect(await prisma.participationLine.count({ where: { participation: { purchase: { idempotencyKey: key } } } })).toBe(1);
  });

  it.each([
    ["receipt code", (request: PixPurchaseInput) => ({ ...request, receiptCode: "DIFFERENT-RECEIPT" })],
    ["actor", (request: PixPurchaseInput) => ({ ...request, playerId: "different-player" })],
    ["plate", (request: PixPurchaseInput) => ({
      ...request,
      participations: request.participations.map((participation) => ({
        ...participation,
        lines: participation.lines.map((line) => ({ ...line, plateDisplay: "XYZ-9876" })),
      })),
    })],
    ["allocation", (request: PixPurchaseInput) => ({
      ...request,
      participations: request.participations.map((participation) => ({
        ...participation,
        lines: participation.lines.map((line) => ({ ...line, unitCents: line.unitCents + 1 })),
      })),
    })],
    ["rule snapshot", (request: PixPurchaseInput) => ({
      ...request,
      participations: request.participations.map((participation) => ({
        ...participation,
        lines: participation.lines.map((line) => ({
          ...line,
          ruleSnapshot: { version: "integration-v2" },
        })),
      })),
    })],
  ])("rejects a same-key replay when %s changes", async (_field, mutate) => {
    const key = `it-field-conflict-${suffix}-${String(_field).replaceAll(" ", "-")}`;
    const original = input(key, `IT-RECEIPT-FIELD-${suffix}`);
    await createPendingPixPurchase(prisma, original, fixedNow);

    await expect(
      createPendingPixPurchase(prisma, mutate(original), fixedNow),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
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
