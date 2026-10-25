import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
  closeRound: vi.fn(),
  openRound: vi.fn(),
  drawRoundResults: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  authPrisma: {
    round: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/modules/rounds/close-round", () => ({ closeRound: mocks.closeRound }));
vi.mock("@/modules/rounds/open-round", () => ({ openRound: mocks.openRound }));
vi.mock("@/modules/rounds/draw-round-results", () => ({ drawRoundResults: mocks.drawRoundResults }));

import { GET } from "./route";

function request(authorization?: string) {
  return new NextRequest("https://example.test/api/internal/round-scheduler", {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/internal/round-scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ROUND_SCHEDULER_SECRET", "test-secret-long-enough");
    mocks.findUnique.mockResolvedValue({ id: "already-scheduled" });
    mocks.findFirst.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([]);
  });

  it("rejects missing and invalid scheduler credentials", async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("Bearer wrong-secret"))).status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("accepts a valid scheduler credential and reports an idempotent run", async () => {
    const response = await GET(request("Bearer test-secret-long-enough"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true, created: 0, closed: 0, drawn: 0, failures: 0, timeZone: "America/Sao_Paulo",
    });
    expect(mocks.findUnique).toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledTimes(3);
  });
});
