import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Joga Placa | Seu jogo de placas",
  description: "Jogue uma placa e concorra automaticamente a seis prêmios.",
};

export default function HomePage() {
  return (
    <div className="home-page home-page-compact">
      <SiteHeader />
      <main className="home-entry">
        <p className="home-eyebrow">Como funciona o jogo das placas</p>
        <figure className="home-how-infographic">
          <img
            src="/images/brand/como-funciona-duas-placas.PNG"
            alt="Infográfico explicando as categorias de prêmio para placa cinza e placa Mercosul."
            decoding="async"
          />
          <figcaption>
            Jogue uma placa e concorra automaticamente a seis prêmios: unidade, dezena, centena, milhar, as três letras e a placa inteira.
          </figcaption>
        </figure>
        <nav className="home-entry-actions" aria-label="Acesso à conta">
          <Link className="home-entry-login" href="/login">Entrar</Link>
          <Link className="home-entry-register" href="/cadastro">Criar conta</Link>
        </nav>
      </main>
    </div>
  );
}
