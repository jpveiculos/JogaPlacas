import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  roundFindMany: vi.fn(),
  purchaseCount: vi.fn(),
  roundCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
  authPrisma: {
    round: { findMany: mocks.roundFindMany },
    purchase: { count: mocks.purchaseCount },
    $transaction: mocks.transaction,
  },
  SESSION_COOKIE: "jogaplacas_session",
}));

import { GET } from "./route";

function request(token = "session-token") {
  return new NextRequest("https://example.test/api/admin/rounds", {
    headers: token ? { cookie: "jogaplacas_session=" + token } : {},
  });
}

describe("GET /api/admin/rounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      id: "admin-1", username: "admin", role: "ADMIN", status: "ACTIVE", mustChangePassword: false,
    });
    mocks.roundFindMany.mockResolvedValue([{
      id: "round-123456", code: "R-12:30",
      startsAt: new Date("2035-01-01T12:00:00Z"),
      cutoffAt: new Date("2035-01-01T12:29:00Z"),
      resultAt: new Date("2035-01-01T12:30:00Z"),
      status: "SCHEDULED", resultLegacyPlate: null, resultMercosurPlate: null,
      _count: { participations: 4 },
    }]);
    mocks.purchaseCount.mockResolvedValueOnce(2).mockResolvedValueOnce(8);
    mocks.roundCreate.mockResolvedValue({ id: "round-new-123", code: "JP-20350101-1200", startsAt: new Date("2035-01-01T12:00:00Z"), cutoffAt: new Date("2035-01-01T12:29:00Z"), resultAt: new Date("2035-01-01T12:30:00Z"), status: "SCHEDULED" });
    mocks.auditCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback({ round: { create: mocks.roundCreate }, auditEvent: { create: mocks.auditCreate } }));
  });

  it("requires an authenticated session", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const result = await GET(request());
    expect(result.status).toBe(401);
    expect(mocks.roundFindMany).not.toHaveBeenCalled();
  });

  it.each(["PLAYER", "CASHIER"])("denies role %s", async (role) => {
    mocks.getSessionUser.mockResolvedValue({
      id: "user-1", username: "user", role, status: "ACTIVE", mustChangePassword: false,
    });
    const result = await GET(request());
    expect(result.status).toBe(403);
    expect(mocks.roundFindMany).not.toHaveBeenCalled();
  });

  it("returns the round overview and aggregate purchase counts without caching", async () => {
    const result = await GET(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store, private");
    expect(await result.json()).toMatchObject({
      rounds: [{ id: "round-123456", participationCount: 4, status: "SCHEDULED" }],
      summary: { pendingPayments: 2, confirmedPurchases: 8 },
    });
    expect(mocks.roundFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(mocks.purchaseCount).toHaveBeenCalledTimes(2);
  });
});


describe("POST /api/admin/rounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      id: "admin-1", username: "admin", role: "ADMIN", status: "ACTIVE", mustChangePassword: false,
    });
    mocks.roundCreate.mockResolvedValue({ id: "round-new-123", code: "JP-20350101-1200", startsAt: new Date("2035-01-01T12:00:00Z"), cutoffAt: new Date("2035-01-01T12:29:00Z"), resultAt: new Date("2035-01-01T12:30:00Z"), status: "SCHEDULED" });
    mocks.auditCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback({ round: { create: mocks.roundCreate }, auditEvent: { create: mocks.auditCreate } }));
  });

  function createRequest(body: unknown, origin = "https://example.test") {
    return new NextRequest("https://example.test/api/admin/rounds", {
      method: "POST", headers: { origin, "content-type": "application/json", cookie: "jogaplacas_session=session-token" },
      body: JSON.stringify(body),
    });
  }

  it("rejects cross-origin round creation", async () => {
    const result = await (await import("./route")).POST(createRequest({
      startsAt: "2035-01-01T12:01:00.000Z", resultAt: "2035-01-01T12:30:00.000Z",
    }, "https://attacker.test"));
    expect(result.status).toBe(403);
    expect(mocks.roundCreate).not.toHaveBeenCalled();
  });

  it("requires the admin role", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "player-1", username: "player", role: "PLAYER", status: "ACTIVE", mustChangePassword: false });
    const result = await (await import("./route")).POST(createRequest({
      startsAt: "2035-01-01T12:00:00.000Z", resultAt: "2035-01-01T12:30:00.000Z",
    }));
    expect(result.status).toBe(403);
    expect(mocks.roundCreate).not.toHaveBeenCalled();
  });

  it("rejects intervals outside the exact recurring schedule", async () => {
    const result = await (await import("./route")).POST(createRequest({
      startsAt: "2035-01-01T12:01:00.000Z", resultAt: "2035-01-01T12:28:00.000Z",
    }));
    expect(result.status).toBe(400);
    expect(mocks.roundCreate).not.toHaveBeenCalled();
  });

  it("accepts the 29-minute interval aligned to a half-hour result", async () => {
    const result = await (await import("./route")).POST(createRequest({
      startsAt: "2035-01-01T12:01:00.000Z", resultAt: "2035-01-01T12:30:00.000Z",
    }));
    expect(result.status).toBe(201);
    expect(mocks.roundCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      startsAt: new Date("2035-01-01T12:00:00.000Z"),
      cutoffAt: new Date("2035-01-01T12:28:00.000Z"),
      resultAt: new Date("2035-01-01T12:29:00.000Z"),
    }), select: expect.any(Object) });
  });

  it("creates and audits a future round transactionally", async () => {
    const result = await (await import("./route")).POST(createRequest({
      startsAt: "2035-01-01T12:00:00.000Z", resultAt: "2035-01-01T12:30:00.000Z",
    }));
    expect(result.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.roundCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      code: expect.stringMatching(/^JP-20350101-\d{4}$/),
      startsAt: new Date("2035-01-01T12:00:00.000Z"),
      cutoffAt: new Date("2035-01-01T12:29:00.000Z"),
      resultAt: new Date("2035-01-01T12:30:00.000Z"), status: "SCHEDULED",
    }), select: expect.any(Object) });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorId: "admin-1", action: "ROUND_CREATED", entityType: "Round",
    }) });
  });
});
