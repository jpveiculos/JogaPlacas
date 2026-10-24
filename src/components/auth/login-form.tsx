"use client";
import { FormEvent, useState } from "react";

type SessionResponse = { authenticated: true; user: { role: "PLAYER" | "CASHIER" | "ADMIN"; mustChangePassword: boolean } };
const destinationByRole = { PLAYER: "/player", CASHIER: "/cashier", ADMIN: "/admin" } as const;

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!login.ok) {
        setError(login.status === 401 ? "Usuário ou senha inválidos." : "Não foi possível entrar agora. Tente novamente.");
        return;
      }
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setError("Não foi possível confirmar sua sessão. Tente novamente.");
        return;
      }
      const session = await response.json() as SessionResponse;
      if (session.user.mustChangePassword) {
        await fetch("/api/auth/logout", { method: "POST" });
        setError("Esta conta exige a troca da senha inicial. O acesso ficará bloqueado até que o fluxo seguro de troca seja disponibilizado.");
        return;
      }
      window.location.assign(destinationByRole[session.user.role]);
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="username">Usuário</label>
      <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)} required />
      <label htmlFor="password">Senha</label>
      <input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} required />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Verificando..." : "Entrar"}</button>
    </form>
  );
}