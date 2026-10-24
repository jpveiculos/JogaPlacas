import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar | Joga Placas", description: "Acesse sua área segura do Joga Placas." };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Acesso seguro</p>
        <h1 id="login-title">Joga Placas</h1>
        <p className="auth-description">Entre com suas credenciais para acessar a área correspondente à sua conta.</p>
        <LoginForm />
        <p className="security-note">O acesso é validado no servidor. Não compartilhe sua senha com ninguém.</p>
      </section>
    </main>
  );
}