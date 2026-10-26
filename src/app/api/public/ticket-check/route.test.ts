import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ purchaseFindUnique: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  authPrisma: { purchase: { findUnique: mocks.purchaseFindUnique } },
}));

import { GET } from "./route";
function request(q = "JP-12345678") { return new NextRequest("https://example.test/api/public/ticket-check?q=" + encodeURIComponent(q)); }

describe("GET /api/public/ticket-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.purchaseFindUnique.mockResolvedValue({
      status: "CONFIRMED",
      createdAt: new Date(),
      participations: [{
        round: { code: "R-01", status: "COMPLETED", resultAt: new Date("2026-10-25T12:00:00Z"), resultLegacyPlate: "ABC-1234", resultMercosurPlate: "XYZ1K23" },
        lines: [
          { id: "line-win", plateFormat: "LEGACY", plateDisplay: "ABC-1234", prizeCents: 120, prizeCreditedAt: new Date("2026-10-25T12:10:00Z") },
          { id: "line-no-win", plateFormat: "MERCOSUR", plateDisplay: "ZZZ1K23", prizeCents: 0, prizeCreditedAt: null },
        ],
      }],
    });
  });
  it("requires a complete JP receipt code and never queries by plate", async () => {
    expect((await GET(request("ABC-1234"))).status).toBe(400);
    expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
  });
  it("returns only safe receipt results and confirms prizes only after credit", async () => {
    const response = await GET(request("jp-12345678"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.purchaseFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { receiptCode: "JP-12345678" } }));
    const body = await response.json();
    expect(body.results[0]).toMatchObject({ status: "PREMIADA", prizeCents: 120, resultLegacyPlate: "ABC-1234" });
    expect(body.results[1]).toMatchObject({ status: "NAO_PREMIADA", prizeCents: null });
    expect(JSON.stringify(body)).not.toContain("playerId");
    expect(JSON.stringify(body)).not.toContain("receiptCode");
  });
  it("does not reveal unconfirmed purchases", async () => {
    mocks.purchaseFindUnique.mockResolvedValue({ status: "PENDING_PAYMENT", participations: [] });
    const response = await GET(request());
    expect((await response.json()).found).toBe(false);
  });
  it("sanitizes database errors", async () => {
    mocks.purchaseFindUnique.mockRejectedValue(new Error("private db details"));
    expect((await GET(request())).status).toBe(500);
    expect(await (await GET(request())).json()).toEqual({ error: "Não foi possível consultar agora. Tente novamente." });
  });
});
