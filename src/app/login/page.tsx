import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar | Joga Placas", description: "Acesse sua área segura do Joga Placas." };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <a href="/" className="home-brand home-wordmark auth-wordmark" aria-label="Joga Placas — página inicial"><span className="wordmark-joga">JOGA</span><span className="wordmark-placas">PLACAS</span></a>
        <p className="eyebrow">Acesso seguro</p>
        <h1 id="login-title">Entrar</h1>
        <p className="auth-description">Entre com suas credenciais para acessar a área correspondente à sua conta.</p>
        <LoginForm />
        <p className="security-note">O acesso é validado no servidor. Não compartilhe sua senha com ninguém.</p>
        <p className="security-note">As regras completas do jogo e os termos de uso serão publicados após a conclusão e validação do funcionamento da plataforma.</p>
      </section>
    </main>
  );
}