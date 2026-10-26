import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  createPendingPixPurchase: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  authPrisma: {},
  getSessionUser: mocks.getSessionUser,
  SESSION_COOKIE: "jogaplacas_session",
}));
vi.mock("@/modules/purchases/create-purchase", () => ({
  createPendingPixPurchase: mocks.createPendingPixPurchase,
  PurchaseServiceError: class PurchaseServiceError extends Error {
    code: string;
    constructor(message: string, code: string) { super(message); this.code = code; }
  },
}));

import { POST } from "./route";

function request(body: unknown, options: { origin?: string; token?: string } = {}) {
  return new NextRequest("https://example.test/api/player/purchases", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.origin === undefined ? { origin: "https://example.test" } : { origin: options.origin }),
      ...(options.token === undefined ? { cookie: "jogaplacas_session=session-token" } : options.token ? { cookie: `jogaplacas_session=${options.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
const validBody = () => ({
  idempotencyKey: "idempotency-key-0001",
  roundIds: ["round-1"],
  lines: [{ plateDisplay: "ABC-1234", stakeCents: 100 }],
});
const purchase = () => ({
  id: "purchase-1", receiptCode: null, status: "PENDING_PAYMENT",
  payment: { status: "PENDING" }, totalCents: 100, currency: "BRL",
  participations: [{
    roundId: "round-1", totalCents: 100,
    lines: [{
      plateDisplay: "ABC-1234", unitCents: 20, tensCents: 16, hundredsCents: 16,
      thousandsCents: 16, lettersCents: 16, fullPlateCents: 16,
    }],
  }],
});

describe("POST /api/player/purchases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      id: "player-1", username: "player", role: "PLAYER", status: "ACTIVE", mustChangePassword: false,
    });
    mocks.createPendingPixPurchase.mockResolvedValue(purchase());
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(request(validBody(), { origin: "https://attacker.test" }));
    expect(response.status).toBe(403);
    expect(mocks.getSessionUser).not.toHaveBeenCalled();
    expect(mocks.createPendingPixPurchase).not.toHaveBeenCalled();
  });

  it("requires an authenticated session", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const response = await POST(request(validBody()));
    expect(response.status).toBe(401);
    expect(mocks.createPendingPixPurchase).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "CASHIER"])("rejects role %s", async (role) => {
    mocks.getSessionUser.mockResolvedValue({
      id: "user-1", username: "user", role, status: "ACTIVE", mustChangePassword: false,
    });
    const response = await POST(request(validBody()));
    expect(response.status).toBe(403);
    expect(mocks.createPendingPixPurchase).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads and duplicate rounds", async () => {
    const malformed = await POST(request({ ...validBody(), extra: true }));
    expect(malformed.status).toBe(400);
    const duplicate = await POST(request({ ...validBody(), roundIds: ["round-1", "round-1"] }));
    expect(duplicate.status).toBe(400);
    expect(mocks.createPendingPixPurchase).not.toHaveBeenCalled();
  });

  it("creates a pending purchase with server-owned multipliers and automatic stake allocation", async () => {
    const response = await POST(request(validBody()));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.createPendingPixPurchase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      playerId: "player-1",
      repetitions: 1,
      participations: [{
        roundId: "round-1",
        lines: [{
          plateDisplay: "ABC-1234",
          stakeCents: 100,
          ruleVersion: "approved-v2",
          ruleSnapshot: {
            version: "approved-v2",
            multipliers: { unit: 6, tens: 20, hundreds: 200, thousands: 2_000, letters: 2_000, fullPlate: 200_000 },
          },
        }],
      }],
    }));
    const body = await response.json();
    expect(body.purchase.totalCents).toBe(100);
    expect(body.purchase.participations[0].lines[0].allocationCents).toEqual({
      unit: 20, tens: 16, hundreds: 16, thousands: 16, letters: 16, fullPlate: 16,
    });
    expect(body.purchase.receiptCode).toBeNull();
    expect(body.message).toContain("Nenhum recibo foi emitido");
    expect(body.paymentActionRequired).toBe(true);
    expect(body.message).toContain("A cobrança Pix ainda não foi criada");
  });

  it("does not issue a receipt code while the purchase is pending", async () => {
    await POST(request(validBody()));
    await POST(request(validBody()));
    const first = mocks.createPendingPixPurchase.mock.calls[0]![1];
    const second = mocks.createPendingPixPurchase.mock.calls[1]![1];
    expect(first.receiptCode).toBeUndefined();
    expect(second.receiptCode).toBeUndefined();
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });
  it("does not expose internal errors for unexpected failures", async () => {
    mocks.createPendingPixPurchase.mockRejectedValue(new Error("database secret"));
    const response = await POST(request(validBody()));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Não foi possível registrar a compra agora." });
  });
});
