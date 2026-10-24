import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  settleRoundPrizes: vi.fn(),
  auditCreate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
  authPrisma: { auditEvent: { create: mocks.auditCreate } },
  SESSION_COOKIE: "jogaplacas_session",
}));
vi.mock("@/modules/rounds/settle-round-prizes", () => ({
  settleRoundPrizes: mocks.settleRoundPrizes,
  RoundSettlementError: class RoundSettlementError extends Error {
    code: string;
    constructor(message: string, code: string) { super(message); this.code = code; }
  },
}));

import { POST } from "./route";
import { RoundSettlementError } from "@/modules/rounds/settle-round-prizes";

function request(origin = "https://example.test", token = "session-token") {
  return new NextRequest("https://example.test/api/admin/rounds/round-123456/settle", {
    method: "POST",
    headers: { origin, ...(token ? { cookie: "jogaplacas_session=" + token } : {}) },
  });
}
const context = { params: Promise.resolve({ roundId: "round-123456" }) };

describe("POST /api/admin/rounds/[roundId]/settle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      id: "admin-1", username: "admin", role: "ADMIN", status: "ACTIVE", mustChangePassword: false,
    });
    mocks.settleRoundPrizes.mockResolvedValue({
      roundId: "round-123456", status: "settled", eligibleLines: 3,
      creditedLines: 1, pendingManualPayouts: 1, totalPrizeCents: 5000,
    });
    mocks.auditCreate.mockResolvedValue({});
  });

  it("rejects cross-origin requests", async () => {
    const result = await POST(request("https://attacker.test"), context);
    expect(result.status).toBe(403);
    expect(mocks.settleRoundPrizes).not.toHaveBeenCalled();
  });

  it("requires a valid session", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(401);
    expect(mocks.settleRoundPrizes).not.toHaveBeenCalled();
  });

  it("rejects non-admin roles", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "player-1", username: "player", role: "PLAYER", status: "ACTIVE", mustChangePassword: false,
    });
    expect((await POST(request(), context)).status).toBe(403);
    expect(mocks.settleRoundPrizes).not.toHaveBeenCalled();
  });

  it("requires a valid round id", async () => {
    expect((await POST(request(), { params: Promise.resolve({ roundId: "!" }) })).status).toBe(400);
    expect(mocks.settleRoundPrizes).not.toHaveBeenCalled();
  });

  it("settles as an admin and records an audit event", async () => {
    const result = await POST(request(), context);
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(mocks.settleRoundPrizes).toHaveBeenCalledWith(expect.anything(), "round-123456");
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "ROUND_PRIZES_SETTLED", entityId: "round-123456" }),
    }));
  });

  it("maps an unpublished draw to conflict", async () => {
    mocks.settleRoundPrizes.mockRejectedValue(new RoundSettlementError("not drawn", "ROUND_NOT_DRAWN"));
    expect((await POST(request(), context)).status).toBe(409);
  });

  it("blocks settlement when a stored bet has an invalid format", async () => {
    mocks.settleRoundPrizes.mockRejectedValue(new RoundSettlementError("invalid bet", "INVALID_PLATE_BET"));
    const result = await POST(request(), context);
    expect(result.status).toBe(409);
    await expect(result.json()).resolves.toMatchObject({ error: "Aposta armazenada com formato inválido; apuração bloqueada para reconciliação." });
  });
});
