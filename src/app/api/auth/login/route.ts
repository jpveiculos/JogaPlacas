import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { authPrisma, createSession, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
const schema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(1024),
}).strict();

function secureCookie(request: NextRequest) {
  return request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const user = await authPrisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true, passwordHash: true, status: true },
  });
  const validPassword = await verifyPassword(parsed.data.password, user?.passwordHash ?? "");
  if (!user || user.status !== "ACTIVE" || !validPassword) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: secureCookie(request), sameSite: "lax", path: "/", expires: expiresAt,
  });
  return response;
}
