import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), transaction: vi.fn(),
  createRound: vi.fn(), createAuditEvent: vi.fn(), closeRound: vi.fn(), openRound: vi.fn(), drawRoundResults: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  authPrisma: { round: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, findMany: mocks.findMany }, $transaction: mocks.transaction },
}));
vi.mock("@/modules/rounds/close-round", () => ({ closeRound: mocks.closeRound }));
vi.mock("@/modules/rounds/open-round", () => ({ openRound: mocks.openRound }));
vi.mock("@/modules/rounds/draw-round-results", () => ({ drawRoundResults: mocks.drawRoundResults }));
import { POST } from "./route";

function request(authorization?: string) {
  return new NextRequest("https://example.test/api/internal/round-scheduler", { headers: authorization ? { authorization } : {} });
}

describe("POST /api/internal/round-scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ROUND_SCHEDULER_SECRET", "test-secret-long-enough");
    mocks.findFirst.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([]);
    mocks.createRound.mockResolvedValue({ id: "created-round" });
    mocks.createAuditEvent.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ round: { create: mocks.createRound }, auditEvent: { create: mocks.createAuditEvent } }),
    );
  });

  it("rejects missing and invalid scheduler credentials", async () => {
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("Bearer wrong-secret"))).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not create a round whose sales cutoff has already arrived", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T15:29:00.000Z")); // 12:29 in Brasília
    const response = await POST(request("Bearer test-secret-long-enough"));
    expect(response.status).toBe(200);
    expect(mocks.createRound).toHaveBeenCalled();
    const createdCodes = mocks.createRound.mock.calls.map(([arg]) => arg.data.code);
    expect(createdCodes).toContain("JP-20261025-1300");
    expect(createdCodes).not.toContain("JP-20261025-1230");
    expect(mocks.createAuditEvent).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("accepts a valid scheduler credential and reports an idempotent run", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T15:29:00.000Z"));
    mocks.findMany.mockImplementation(async (args: { where?: { code?: { in?: string[] } } }) => {
      if (args.where?.code?.in) return args.where.code.in.map((code) => ({ code }));
      return [];
    });
    const response = await POST(request("Bearer test-secret-long-enough"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, created: 0, closed: 0, drawn: 0, failures: 0, timeZone: "Etc/GMT+3" });
    expect(mocks.findMany).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });
});
