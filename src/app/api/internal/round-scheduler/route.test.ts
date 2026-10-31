import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
  createRound: vi.fn(),
  createAuditEvent: vi.fn(),
  closeRound: vi.fn(),
  openRound: vi.fn(),
  drawRoundResults: vi.fn(),
  paymentFindMany: vi.fn(),
  paymentUpdateMany: vi.fn(),
  reconcilePixPaymentFromProvider: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  authPrisma: {
    round: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, findMany: mocks.findMany },
    payment: { findMany: mocks.paymentFindMany, updateMany: mocks.paymentUpdateMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/modules/rounds/close-round", () => ({ closeRound: mocks.closeRound }));
vi.mock("@/modules/rounds/open-round", () => ({ openRound: mocks.openRound }));
vi.mock("@/modules/rounds/draw-round-results", () => ({ drawRoundResults: mocks.drawRoundResults }));
vi.mock("@/modules/payments/reconcile-pix-payment", () => ({ reconcilePixPaymentFromProvider: mocks.reconcilePixPaymentFromProvider }));

import { POST } from "./route";

function request(authorization?: string) {
  return new NextRequest("https://example.test/api/internal/round-scheduler", {
    headers: authorization ? { authorization } : {},
  });
}

describe("POST /api/internal/round-scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ROUND_SCHEDULER_SECRET", "test-secret-long-enough");
    mocks.findUnique.mockResolvedValue({ id: "already-scheduled" });
    mocks.findFirst.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([]);
    mocks.createRound.mockResolvedValue({ id: "created-round" });
    mocks.createAuditEvent.mockResolvedValue({});
    mocks.paymentFindMany.mockResolvedValue([]);
    mocks.paymentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.reconcilePixPaymentFromProvider.mockResolvedValue("still_pending");
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ round: { create: mocks.createRound }, auditEvent: { create: mocks.createAuditEvent } }),
    );
  });

  it("rejects missing and invalid scheduler credentials", async () => {
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("Bearer wrong-secret"))).status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("creates the imminent round when the scheduler starts during its cutoff minute", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T15:29:00.000Z")); // 12:29 in Brasília (UTC-03:00)
    mocks.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      where.code === "JP-20261025-1230" ? null : { id: "already-scheduled" },
    );

    const response = await POST(request("Bearer test-secret-long-enough"));

    expect(response.status).toBe(200);
    expect(mocks.createRound).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        code: "JP-20261025-1230",
        startsAt: new Date("2026-10-25T15:01:00.000Z"),
        cutoffAt: new Date("2026-10-25T15:29:00.000Z"),
        resultAt: new Date("2026-10-25T15:30:00.000Z"),
        status: "SCHEDULED",
      }),
    }));
    expect(mocks.createAuditEvent).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("accepts a valid scheduler credential and reports an idempotent run", async () => {
    const response = await POST(request("Bearer test-secret-long-enough"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true, created: 0, closed: 0, drawn: 0, failures: 0, timeZone: "Etc/GMT+3",
      pixChecked: 0, pixConfirmed: 0, pixNeedsReconciliation: 0,
    });
    expect(mocks.findUnique).toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledTimes(3);
  });

  it("reconciles pending Pix payments even when no browser is polling", async () => {
    mocks.paymentFindMany.mockResolvedValue([{ id: "payment-pending-1" }]);
    mocks.reconcilePixPaymentFromProvider.mockResolvedValue("confirmed");
    const response = await POST(request("Bearer test-secret-long-enough"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.paymentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "payment-pending-1", status: "PENDING" }),
    }));
    expect(mocks.reconcilePixPaymentFromProvider).toHaveBeenCalledWith(expect.anything(), "payment-pending-1");
    expect(body).toMatchObject({ pixChecked: 1, pixConfirmed: 1, pixNeedsReconciliation: 0 });
  });

});
