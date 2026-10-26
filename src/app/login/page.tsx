import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

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
        <p className="security-note"><Link href="/termos-de-uso">Leia os termos de uso e o prazo de validade de 7 dias</Link>.</p>
      </section>
    </main>
  );
}