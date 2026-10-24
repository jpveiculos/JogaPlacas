import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  authPrisma: { user: { findUnique: vi.fn() } },
  createSession: vi.fn(),
  SESSION_COOKIE: "jogaplacas_session",
}));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: vi.fn() }));

import { POST } from "./route";
import { authPrisma, createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

const userLookup = vi.mocked(authPrisma.user.findUnique);
const sessionCreate = vi.mocked(createSession);
const passwordVerify = vi.mocked(verifyPassword);

function request(body: unknown, origin = "https://example.test") {
  return new NextRequest("https://example.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a cross-origin request before reading credentials", async () => {
    const response = await POST(request({ username: "admin", password: "not-a-password" }, "https://attacker.test"));
    expect(response.status).toBe(403);
    expect(userLookup).not.toHaveBeenCalled();
  });

  it("rejects malformed input without querying users", async () => {
    const response = await POST(request({ username: "", password: "x", role: "ADMIN" }));
    expect(response.status).toBe(400);
    expect(userLookup).not.toHaveBeenCalled();
  });

  it("uses the same generic response for a missing user", async () => {
    userLookup.mockResolvedValue(null);
    passwordVerify.mockResolvedValue(false);
    const response = await POST(request({ username: "unknown", password: "some-password" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Usuário ou senha inválidos." });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("does not create a session for a blocked account", async () => {
    userLookup.mockResolvedValue({ id: "user-1", passwordHash: "encoded", status: "BLOCKED" } as never);
    passwordVerify.mockResolvedValue(true);
    const response = await POST(request({ username: "blocked", password: "some-password" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Usuário ou senha inválidos." });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("creates a session only after a valid active-user password", async () => {
    userLookup.mockResolvedValue({ id: "user-1", passwordHash: "encoded", status: "ACTIVE" } as never);
    passwordVerify.mockResolvedValue(true);
    sessionCreate.mockResolvedValue({ token: "opaque-token", expiresAt: new Date("2035-01-01T00:00:00.000Z") });
    const response = await POST(request({ username: "active", password: "some-password" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain("opaque-token");
    expect(sessionCreate).toHaveBeenCalledWith("user-1");
  });
});
