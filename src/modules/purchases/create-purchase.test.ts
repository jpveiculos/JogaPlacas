import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@prisma/client";
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
      unitCents: 100,
      tensCents: 0,
      hundredsCents: 0,
      thousandsCents: 0,
      lettersCents: 0,
      fullPlateCents: 0,
      ruleVersion: "test-v1",
      ruleSnapshot: { version: "test-v1" },
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
      clientVersion: "6.16.2",
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

