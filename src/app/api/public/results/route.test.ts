import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ roundFindMany: vi.fn(), participationLineFindMany: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  authPrisma: { round: { findMany: mocks.roundFindMany }, participationLine: { findMany: mocks.participationLineFindMany } },
}));

import { GET } from "./route";
function request(url = "https://example.test/api/public/results") { return new NextRequest(url); }

describe("GET /api/public/results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.roundFindMany.mockResolvedValue([{
      id: "round-1", code: "R-01", resultAt: new Date("2026-10-25T12:00:00.000Z"),
      resultLegacyPlate: "ABC-1234", resultMercosurPlate: "XYZ1K23",
    }]);
    mocks.participationLineFindMany.mockResolvedValue([{
      id: "line-1", plateFormat: "LEGACY", plateDisplay: "ABC-1234", prizeCents: 120,
      participation: {
        round: { code: "R-01", resultAt: new Date("2026-10-25T12:00:00.000Z") },
        purchase: { player: { username: "jogador" } },
      },
    }]);
  });
  it("returns both formats, anonymized credited winners, and disables caching", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.roundFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "COMPLETED", resultLegacyPlate: { not: null }, resultMercosurPlate: { not: null } }),
      take: 101,
    }));
    const body = await response.json();
    expect(body.results[0]).toMatchObject({ legacyPlate: "ABC-1234", mercosurPlate: "XYZ1K23" });
    expect(body.winners[0]).toMatchObject({ displayName: "jo•••", prizeCents: 120, plateFormat: "LEGACY" });
  });
  it("supports older result pages without querying winners again", async () => {
    const response = await GET(request("https://example.test/api/public/results?before=2026-10-20T00%3A00%3A00.000Z%7Cround-older"));
    expect(response.status).toBe(200);
    expect(mocks.roundFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { resultAt: { lt: new Date("2026-10-20T00:00:00.000Z") } },
          { resultAt: new Date("2026-10-20T00:00:00.000Z"), id: { lt: "round-older" } },
        ],
      }),
    }));
    expect(mocks.participationLineFindMany).not.toHaveBeenCalled();
  });
  it("rejects an invalid history cursor", async () => {
    const response = await GET(request("https://example.test/api/public/results?before=not-a-date"));
    expect(response.status).toBe(400);
    expect(mocks.roundFindMany).not.toHaveBeenCalled();
  });
  it("sanitizes database failures", async () => {
    mocks.roundFindMany.mockRejectedValue(new Error("secret db detail"));
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Não foi possível carregar os resultados agora." });
  });
});
