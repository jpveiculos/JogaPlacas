import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { settleRoundPrizes } from "./settle-round-prizes";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1";
const suite = enabled ? describe : describe.skip;

suite("PostgreSQL prize settlement idempotency", () => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (enabled && !databaseUrl) throw new Error("DATABASE_URL is required when RUN_POSTGRES_INTEGRATION=1");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const suffix = randomUUID();
  const playerId = "settlement-player-" + suffix;
  const roundId = "settlement-round-" + suffix;
  const purchaseId = "settlement-purchase-" + suffix;
  const participationId = "settlement-participation-" + suffix;
  const lineId = "settlement-line-" + suffix;

  beforeAll(async () => {
    await prisma.user.create({ data: { id: playerId, username: playerId, passwordHash: "integration-test-only" } });
    await prisma.round.create({
      data: {
        id: roundId, code: "SETTLEMENT-" + suffix,
        startsAt: new Date("2035-01-01T12:00:00.000Z"),
        cutoffAt: new Date("2035-01-01T12:29:00.000Z"),
        resultAt: new Date("2035-01-01T12:30:00.000Z"),
        status: "COMPLETED", resultLegacyPlate: "ABC-1234", resultMercosurPlate: "XYZ9K99",
      },
    });
    await prisma.purchase.create({
      data: {
        id: purchaseId, playerId, status: "CONFIRMED", paymentMethod: "PIX",
        totalCents: 100, currency: "BRL", receiptCode: "SETTLEMENT-RECEIPT-" + suffix,
        idempotencyKey: "settlement-idempotency-" + suffix, confirmedAt: new Date(),
      },
    });
    await prisma.purchaseParticipation.create({
      data: {
        id: participationId, purchaseId, roundId, status: "CONFIRMED",
        totalCents: 100, confirmedAt: new Date(),
      },
    });
    await prisma.participationLine.create({
      data: {
        id: lineId, participationId, plateFormat: "LEGACY",
        plateDisplay: "ABC-1234", normalizedPlate: "ABC1234",
        unitCents: 100, tensCents: 0, hundredsCents: 0, thousandsCents: 0,
        lettersCents: 0, fullPlateCents: 0, ruleVersion: "integration-v1",
        ruleSnapshot: { version: "integration-v1", multipliers: { unit: 2, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 } },
      },
    });
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { entityType: "Round", entityId: roundId } });
    await prisma.ledgerEntry.deleteMany({ where: { idempotencyKey: "prize-credit:" + lineId } });
    await prisma.participationLine.deleteMany({ where: { id: lineId } });
    await prisma.purchaseParticipation.deleteMany({ where: { id: participationId } });
    await prisma.purchase.deleteMany({ where: { id: purchaseId } });
    await prisma.round.deleteMany({ where: { id: roundId } });
    await prisma.user.deleteMany({ where: { id: playerId } });
    await prisma.$disconnect();
  });

  it("credits the same winning line only once across concurrent and repeated settlement calls", async () => {
    const [first, concurrent] = await Promise.all([
      settleRoundPrizes(prisma, roundId, playerId),
      settleRoundPrizes(prisma, roundId),
    ]);
    const second = await settleRoundPrizes(prisma, roundId);

    expect(first.creditedLines).toBe(1);
    expect(concurrent.creditedLines).toBe(1);
    expect(second.creditedLines).toBe(1);
    expect(await prisma.ledgerEntry.count({ where: { idempotencyKey: "prize-credit:" + lineId } })).toBe(1);
    expect(await prisma.ledgerEntry.findUnique({ where: { idempotencyKey: "prize-credit:" + lineId } }))
      .toMatchObject({ userId: playerId, amountCents: 200, type: "PRIZE_CREDIT" });
    expect(await prisma.participationLine.findUnique({ where: { id: lineId } }))
      .toMatchObject({ prizeCents: 200 });
    expect(await prisma.auditEvent.count({ where: { action: "ROUND_PRIZES_SETTLED", entityType: "Round", entityId: roundId } })).toBe(3);
  });
});
