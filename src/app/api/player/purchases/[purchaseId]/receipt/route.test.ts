import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  purchaseFindUnique: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  authPrisma: { purchase: { findUnique: mocks.purchaseFindUnique } },
  getSessionUser: mocks.getSessionUser,
  SESSION_COOKIE: "jogaplacas_session",
}));

import { GET } from "./route";

function request(token = "session-token") {
  return new NextRequest("https://example.test/api/player/purchases/purchase-12345678/receipt", {
    headers: token ? { cookie: "jogaplacas_session=" + token } : {},
  });
}
const confirmedPurchase = () => ({
  id: "purchase-12345678",
  createdAt: new Date(),
  playerId: "player-1",
  cashierId: null,
  status: "CONFIRMED",
  paymentMethod: "PIX",
  totalCents: 200,
  currency: "BRL",
  receiptCode: "JP-12345678",
  confirmedAt: new Date("2026-10-25T12:00:00.000Z"),
  payment: { status: "CONFIRMED", confirmedAt: new Date("2026-10-25T12:00:00.000Z") },
  participations: [
    {
      round: { code: "JP-20261025-1230", resultAt: new Date("2026-10-25T12:30:00.000Z") },
      lines: [{
        plateDisplay: "ABC-1234", plateFormat: "LEGACY", unitCents: 20, tensCents: 16,
        hundredsCents: 16, thousandsCents: 16, lettersCents: 16, fullPlateCents: 16,
      }],
    },
    {
      round: { code: "JP-20261025-1300", resultAt: new Date("2026-10-25T13:00:00.000Z") },
      lines: [{
        plateDisplay: "XYZ1K23", plateFormat: "MERCOSUR", unitCents: 20, tensCents: 16,
        hundredsCents: 16, thousandsCents: 16, lettersCents: 16, fullPlateCents: 16,
      }],
    },
  ],
});

describe("GET purchase receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      id: "player-1", username: "player", role: "PLAYER", status: "ACTIVE", mustChangePassword: false,
    });
    mocks.purchaseFindUnique.mockResolvedValue(confirmedPurchase());
  });

  it("requires a session and does not query when unauthenticated", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect((await GET(request(), { params: Promise.resolve({ purchaseId: "purchase-12345678" }) })).status).toBe(401);
    expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
  });

  it("returns a single receipt with sequential rounds for the owner after confirmed payment", async () => {
    const response = await GET(request(), { params: Promise.resolve({ purchaseId: "purchase-12345678" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    const body = await response.json();
    expect(body.receipt).toMatchObject({
      purchaseId: "purchase-12345678",
      receiptCode: "JP-12345678",
      paymentStatus: "CONFIRMED",
      totalCents: 200,
      plates: [
        { roundCode: "JP-20261025-1230", plateDisplay: "ABC-1234", plateFormat: "LEGACY", stakeCents: 100 },
        { roundCode: "JP-20261025-1300", plateDisplay: "XYZ1K23", plateFormat: "MERCOSUR", stakeCents: 100 },
      ],
    });
  });

  it("does not disclose whether another user's purchase exists", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "player-2", username: "other", role: "PLAYER", status: "ACTIVE", mustChangePassword: false,
    });
    const response = await GET(request(), { params: Promise.resolve({ purchaseId: "purchase-12345678" }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Compra não encontrada." });
  });

  it("never returns an official receipt before payment confirmation", async () => {
    mocks.purchaseFindUnique.mockResolvedValue({ ...confirmedPurchase(), payment: { status: "PENDING", confirmedAt: null } });
    const response = await GET(request(), { params: Promise.resolve({ purchaseId: "purchase-12345678" }) });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("após a confirmação");
  });

  it("requires a valid purchase identifier", async () => {
    const response = await GET(request(), { params: Promise.resolve({ purchaseId: "short" }) });
    expect(response.status).toBe(404);
    expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
  });

  it("allows an administrator to read a confirmed receipt", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "admin-1", username: "admin", role: "ADMIN", status: "ACTIVE", mustChangePassword: false,
    });
    const response = await GET(request(), { params: Promise.resolve({ purchaseId: "purchase-12345678" }) });
    expect(response.status).toBe(200);
  });

  it("allows a cashier to read only purchases assigned to that cashier", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "cashier-1", username: "cashier", role: "CASHIER", status: "ACTIVE", mustChangePassword: false,
    });
    mocks.purchaseFindUnique.mockResolvedValue({ ...confirmedPurchase(), cashierId: "cashier-1" });
    const allowed = await GET(request(), { params: Promise.resolve({ purchaseId: "purchase-12345678" }) });
    expect(allowed.status).toBe(200);

    mocks.purchaseFindUnique.mockResolvedValue({ ...confirmedPurchase(), cashierId: "cashier-2" });
    const denied = await GET(request(), { params: Promise.resolve({ purchaseId: "purchase-12345678" }) });
    expect(denied.status).toBe(404);
  });

});
