import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import {
  createPendingPixPurchase,
  type PixPurchaseInput,
} from "./create-purchase";

const transaction = vi.fn();

const validInput = (): PixPurchaseInput => ({
  idempotencyKey: "test-idempotency-key",
  receiptCode: "TEST-RECEIPT-001",
  playerId: "player-1",
  repetitions: 1,
  participations: [{
    roundId: "round-1",
    lines: [{
      plateDisplay: "ABC-1234",
      stakeCents: 100,
      ruleVersion: "test-v1",
      ruleSnapshot: { version: "test-v1", multipliers: { unit: 6, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 } },
    }],
  }],
});

describe("createPendingPixPurchase input validation", () => {
  beforeEach(() => {
    transaction.mockReset();
  });

  const service = () => ({
    $transaction: transaction,
  } as unknown as PrismaClient);

  it("rejects an empty idempotency key before opening a transaction", async () => {
    const input = validInput();
    input.idempotencyKey = "   ";

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_IDEMPOTENCY_KEY" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a purchase without exactly one player or cashier", async () => {
    const input = validInput();
    input.playerId = undefined;

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_ACTOR" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("requires a customer for cashier purchases", async () => {
    const input = validInput();
    input.playerId = undefined;
    input.cashierId = "cashier-1";

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_ACTOR" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a participation count that differs from repetitions", async () => {
    const input = validInput();
    input.repetitions = 2;

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_PURCHASE" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate round ids before opening a transaction", async () => {
    const input = validInput();
    input.repetitions = 2;
    const firstParticipation = input.participations[0]!;
    input.participations.push({ ...firstParticipation });

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_PURCHASE" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a blank receipt code", async () => {
    const input = validInput();
    input.receiptCode = " ";

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_PURCHASE" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([0, 11, 1.5])("rejects invalid repetition count %s before opening a transaction", async (repetitions) => {
    const input = validInput();
    input.repetitions = repetitions;
    input.participations = repetitions === 1 ? input.participations : [];

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_PURCHASE" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a rule snapshot without historical multipliers before opening a transaction", async () => {
    const input = validInput();
    input.participations[0]!.lines[0]!.ruleSnapshot = { version: "test-v1" };

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_PURCHASE" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid plate format before opening a transaction", async () => {
    const input = validInput();
    input.participations[0]!.lines[0]!.plateDisplay = "NOT-A-PLATE";

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_PURCHASE" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty plate list before opening a transaction", async () => {
    const input = validInput();
    input.participations[0]!.lines = [];

    await expect(createPendingPixPurchase(service(), input))
      .rejects.toMatchObject({ code: "INVALID_PURCHASE" });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("createPendingPixPurchase transaction conflict retries", () => {
  beforeEach(() => {
    transaction.mockReset();
  });

  const service = () => ({
    $transaction: transaction,
  } as unknown as PrismaClient);

  const prismaError = (code: "P2034" | "P2002", target?: string[]) =>
    new Prisma.PrismaClientKnownRequestError("simulated transaction conflict", {
      code,
      clientVersion: "7.10.1",
      meta: target ? { target } : undefined,
    });

  it("retries serialization conflicts at most three times after the initial attempt", async () => {
    transaction.mockRejectedValue(prismaError("P2034"));

    await expect(createPendingPixPurchase(service(), validInput()))
      .rejects.toMatchObject({ code: "P2034" });

    expect(transaction).toHaveBeenCalledTimes(4);
  });

  it("retries a unique constraint conflict only once", async () => {
    transaction.mockRejectedValue(prismaError("P2002", ["idempotencyKey"]));

    await expect(createPendingPixPurchase(service(), validInput()))
      .rejects.toMatchObject({ code: "P2002" });

    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry a unique constraint conflict unrelated to idempotency", async () => {
    transaction.mockRejectedValue(prismaError("P2002", ["receiptCode"]));

    await expect(createPendingPixPurchase(service(), validInput()))
      .rejects.toMatchObject({ code: "P2002" });

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("does not retry unrelated errors", async () => {
    transaction.mockRejectedValue(new Error("database unavailable"));

    await expect(createPendingPixPurchase(service(), validInput()))
      .rejects.toThrow("database unavailable");

    expect(transaction).toHaveBeenCalledTimes(1);
  });
});


describe("createPendingPixPurchase idempotency replay", () => {
  beforeEach(() => {
    transaction.mockReset();
  });

  const serviceWithExistingPurchase = (existing: unknown) => {
    const tx = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue(existing),
      },
    };
    transaction.mockImplementation(async (callback: (client: unknown) => unknown) =>
      callback(tx),
    );
    return {
      prisma: { $transaction: transaction } as unknown as PrismaClient,
      findUnique: tx.purchase.findUnique,
    };
  };

  const existingPurchase = () => ({
    id: "purchase-existing",
    paymentMethod: "PIX",
    receiptCode: "TEST-RECEIPT-001",
    playerId: "player-1",
    cashierId: null,
    customerId: null,
    participations: [{
      roundId: "round-1",
      lines: [{
        plateFormat: "LEGACY",
        normalizedPlate: "ABC1234",
        unitCents: 20,
        tensCents: 16,
        hundredsCents: 16,
        thousandsCents: 16,
        lettersCents: 16,
        fullPlateCents: 16,
        ruleVersion: "test-v1",
        ruleSnapshot: { version: "test-v1", multipliers: { unit: 6, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 } },
      }],
    }],
    payment: { id: "payment-existing", status: "PENDING" },
  });

  it("returns the original purchase when the idempotency key is replayed with the same request", async () => {
    const existing = existingPurchase();
    const { prisma, findUnique } = serviceWithExistingPurchase(existing);

    await expect(createPendingPixPurchase(prisma, validInput()))
      .resolves.toBe(existing);

    expect(findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "test-idempotency-key" },
      include: { participations: { include: { lines: true } }, payment: true },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of an idempotency key with a different receipt code", async () => {
    const { prisma } = serviceWithExistingPurchase(existingPurchase());
    const input = validInput();
    input.receiptCode = "DIFFERENT-RECEIPT";

    await expect(createPendingPixPurchase(prisma, input))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of an idempotency key with different purchase lines", async () => {
    const { prisma } = serviceWithExistingPurchase(existingPurchase());
    const input = validInput();
    input.participations[0]!.lines[0]!.stakeCents = 200;

    await expect(createPendingPixPurchase(prisma, input))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
