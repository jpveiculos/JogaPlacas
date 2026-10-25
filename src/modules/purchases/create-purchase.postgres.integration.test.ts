import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { createPendingPixPurchase, type PixPurchaseInput } from "./create-purchase";
import { closeRound } from "../rounds/close-round";

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
        stakeCents: 100,
        ruleVersion: "integration-v1",
        ruleSnapshot: { version: "integration-v1", multipliers: { unit: 6, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 } },
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
        startsAt: new Date("2035-01-01T11:30:00.000Z"),
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
        lines: participation.lines.map((line) => ({ ...line, stakeCents: line.stakeCents + 1 })),
      })),
    })],
    ["rule snapshot", (request: PixPurchaseInput) => ({
      ...request,
      participations: request.participations.map((participation) => ({
        ...participation,
        lines: participation.lines.map((line) => ({
          ...line,
          ruleSnapshot: { version: "integration-v2", multipliers: { unit: 6, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 } },
        })),
      })),
    })],
  ])("rejects a same-key replay when %s changes", async (_field, mutate) => {
    const key = `it-field-conflict-${suffix}-${String(_field).replaceAll(" ", "-")}`;
    const original = input(key, `IT-RECEIPT-FIELD-${suffix}-${String(_field).replaceAll(" ", "-")}`);
    await createPendingPixPurchase(prisma, original, fixedNow);

    await expect(
      createPendingPixPurchase(prisma, mutate(original), fixedNow),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
  });

  it.each([
    ["exactly at cutoff", new Date("2035-01-01T12:30:00.000Z")],
    ["after cutoff", new Date("2035-01-01T12:30:00.001Z")],
  ])("rejects a new purchase %s", async (_label, decisionTime) => {
    const key = `it-cutoff-${suffix}-${String(_label).replaceAll(" ", "-")}`;

    await expect(
      createPendingPixPurchase(
        prisma,
        input(key, `IT-RECEIPT-CUTOFF-${suffix}-${String(_label).replaceAll(" ", "-")}`),
        decisionTime,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PURCHASE" });

    expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(0);
    expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(0);
    expect(await prisma.purchaseParticipation.count({ where: { purchase: { idempotencyKey: key } } })).toBe(0);
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
  it("rejects a purchase when its round lock is released after the real PostgreSQL cutoff", async () => {
    const timedRoundId = `it-cutoff-lock-${suffix}`;
    const key = `it-cutoff-lock-purchase-${suffix}`;
    const cutoffAt = new Date(Date.now() + 1_500);

    await prisma.round.create({
      data: {
        id: timedRoundId,
        code: `IT-LOCK-${suffix}`,
        startsAt: new Date(cutoffAt.getTime() + 60_000),
        cutoffAt,
        resultAt: new Date(cutoffAt.getTime() + 120_000),
        status: "OPEN",
      },
    });

    let releaseLock: (() => void) | undefined;
    let signalLockAcquired: (() => void) | undefined;
    const lockAcquired = new Promise<void>((resolve) => {
      signalLockAcquired = resolve;
    });
    const lockReleased = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const holdingTransaction = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Round" WHERE "id" = ${timedRoundId} FOR UPDATE`;
      signalLockAcquired!();
      await lockReleased;
    });

    try {
      await lockAcquired;

      // Start while the cutoff is still in the future. The holder keeps the
      // row lock, forcing the purchase transaction to decide only after release.
      const purchasePromise = createPendingPixPurchase(
        prisma,
        {
          ...input(key, `IT-RECEIPT-LOCK-${suffix}`),
          participations: [{
            ...input(key, `IT-RECEIPT-LOCK-${suffix}`).participations[0]!,
            roundId: timedRoundId,
          }],
        },
      );

      let purchaseObservedWaitingForLock = false;
      const lockObservationDeadline = Date.now() + 800;
      while (Date.now() < lockObservationDeadline && Date.now() < cutoffAt.getTime()) {
        const waiting = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) AS count
          FROM pg_stat_activity
          WHERE wait_event_type = 'Lock'
            AND query ILIKE '%FOR UPDATE%'
            AND query ILIKE '%Round%'
        `;
        if (Number(waiting[0]?.count ?? 0) > 0) {
          purchaseObservedWaitingForLock = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(purchaseObservedWaitingForLock).toBe(true);

      const remainingUntilCutoff = cutoffAt.getTime() - Date.now();
      if (remainingUntilCutoff > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingUntilCutoff + 150));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      releaseLock!();
      await holdingTransaction;

      await expect(purchasePromise).rejects.toMatchObject({ code: "INVALID_PURCHASE" });
      expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(0);
      expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(0);
      expect(await prisma.purchaseParticipation.count({ where: { purchase: { idempotencyKey: key } } })).toBe(0);
    } finally {
      releaseLock?.();
      await holdingTransaction.catch(() => undefined);
      await prisma.participationLine.deleteMany({ where: { participation: { roundId: timedRoundId } } });
      await prisma.payment.deleteMany({ where: { purchase: { participations: { some: { roundId: timedRoundId } } } } });
      await prisma.purchaseParticipation.deleteMany({ where: { roundId: timedRoundId } });
      await prisma.purchase.deleteMany({ where: { idempotencyKey: key } });
      await prisma.round.deleteMany({ where: { id: timedRoundId } });
    }
  });

  it("serializes a purchase decision against concurrent round closure", async () => {
    const key = `it-close-race-${suffix}`;
    const request = input(key, `IT-RECEIPT-CLOSE-RACE-${suffix}`);
    const beforeCutoff = new Date("2035-01-01T12:29:59.999Z");
    const atCutoff = new Date("2035-01-01T12:30:00.000Z");

    const [purchaseResult, closeResult] = await Promise.allSettled([
      createPendingPixPurchase(prisma, request, beforeCutoff),
      closeRound(prisma, roundId, atCutoff),
    ]);

    expect(closeResult.status).toBe("fulfilled");
    expect((await prisma.round.findUniqueOrThrow({ where: { id: roundId } })).status).toBe("CLOSED");

    if (purchaseResult.status === "fulfilled") {
      // Purchase won the row-lock race before cutoff; closure then followed it.
      expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(1);
      expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
      expect(await prisma.purchaseParticipation.count({ where: { purchase: { idempotencyKey: key } } })).toBe(1);
    } else {
      // Closure won the row-lock race; the purchase must observe CLOSED.
      expect(purchaseResult.reason).toMatchObject({ code: "ROUND_UNAVAILABLE" });
      expect(await prisma.purchase.count({ where: { idempotencyKey: key } })).toBe(0);
      expect(await prisma.payment.count({ where: { purchase: { idempotencyKey: key } } })).toBe(0);
      expect(await prisma.purchaseParticipation.count({ where: { purchase: { idempotencyKey: key } } })).toBe(0);
    }
  });

});
