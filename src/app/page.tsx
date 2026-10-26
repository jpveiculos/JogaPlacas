import type { Metadata } from "next";
import Link from "next/link";
import { QuickTicketCheck } from "@/components/results/quick-ticket-check";
import { PublicResultsBoard } from "@/components/results/public-results-board";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Joga Placas | Consulte seu recibo e resultados",
  description: "Conheça o Joga Placas, consulte seu recibo e acompanhe os resultados publicados das placas cinza e Mercosul.",
};

export default async function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <Link href="/" className="home-brand" aria-label="Joga Placa — página inicial"><img src="/images/brand/joga-placa-logo.jpg" alt="Joga Placa" /></Link>
        <nav className="home-nav" aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#consulta-recibo">Consultar recibo</a>
          <a href="#resultados-publicos">Resultados</a>
          <Link className="home-login-button" href="/login">Entrar</Link>
          <Link className="home-login-button" href="/cadastro">Criar cadastro</Link>
        </nav>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-eyebrow">Resultados e consulta em um só lugar</p>
          <h1 id="home-title">Seu jogo. Seu recibo. <span>Confira por aqui.</span></h1>
          <p className="home-hero-description">Jogue pela plataforma ou com um cambista e use o código do recibo para consultar sua aposta. Acompanhe também os resultados publicados das placas cinza e Mercosul.</p>
          <div className="home-hero-actions">
            <a className="home-primary-button" href="#consulta-recibo">Consultar meu recibo</a>
            <Link className="home-secondary-button" href="/login">Entrar na minha conta</Link>
            <Link className="home-secondary-button" href="/cadastro">Criar minha conta</Link>
          </div>
          <p className="home-small-note">A consulta pública não exige cadastro nem login.</p>
        </div>
        <div className="home-hero-art" aria-label="Dois formatos de placa usados no jogo">
          <div className="home-plate-card"><span>PLACA CINZA</span><strong>ABC·1234</strong><small>Formato antigo</small></div>
          <div className="home-plate-card home-plate-mercosur"><span>PLACA MERCOSUL</span><strong>ABC1D23</strong><small>Formato Mercosul</small></div>
          <div className="home-hero-stamp">Confira<br />seu recibo</div>
        </div>
      </section>

      <section id="consulta-recibo" className="home-ticket-section" aria-labelledby="home-ticket-title">
        <div className="home-section-intro">
          <p className="home-eyebrow">Para quem jogou na plataforma ou com cambista</p>
          <h2 id="home-ticket-title">Confira seu jogo pelo código do recibo</h2>
          <p>Está com o recibo impresso? Localize o código iniciado por <strong>JP-</strong>, digite no campo abaixo e toque em consultar para ver as informações disponíveis da sua aposta.</p>
        </div>
        <QuickTicketCheck compact />
      </section>

      <section id="como-funciona" className="home-how-section" aria-labelledby="home-how-title">
        <div className="home-section-intro">
          <p className="home-eyebrow">Simples e direto</p>
          <h2 id="home-how-title">Como funciona</h2>
          <p>Use o recibo para consultar sua participação e acompanhe os dois resultados independentes de cada rodada publicada.</p>
        </div>
        <div className="home-steps">
          <article><span>01</span><h3>Faça sua aposta</h3><p>Participe pela sua conta, quando disponível, ou jogue presencialmente com um cambista autorizado.</p></article>
          <article><span>02</span><h3>Guarde o recibo</h3><p>Confira se o recibo foi emitido e mantenha o código iniciado por JP- para consultar sua aposta.</p></article>
          <article><span>03</span><h3>Consulte os resultados</h3><p>Compare os resultados publicados da placa cinza e da placa Mercosul com as informações do recibo.</p></article>
        </div>
        <div className="home-rules-note">
          <strong>Placa cinza e placa Mercosul têm resultados independentes.</strong>
          <p>As categorias, equivalências e valores de prêmio devem seguir as regras oficiais vigentes do jogo. Consulte os termos publicados antes de participar; esta página não promete prêmio nem substitui a conferência do recibo.</p>
          <Link href="/termos-de-uso">Consultar termos de uso</Link>
        </div>
      </section>

      <section id="resultados-publicos" className="home-results-section" aria-label="Resultados e ganhadores públicos">
        <div className="home-section-intro">
          <p className="home-eyebrow">Transparência</p>
          <h2>Resultados publicados e prêmios confirmados</h2>
          <p>Acompanhe os resultados de cada rodada e veja os prêmios que foram efetivamente confirmados. Os nomes dos ganhadores são apresentados de forma mascarada.</p>
        </div>
        <PublicResultsBoard />
        <p className="home-results-link"><Link href="/resultados">Abrir a página de resultados</Link></p>
      </section>

      <footer className="home-footer">
        <Link href="/" className="home-brand"><img src="/images/brand/joga-placa-logo.jpg" alt="Joga Placa" /></Link>
        <div><Link href="/termos-de-uso">Termos de uso</Link><Link href="/login">Entrar</Link></div>
        <p>Consulte sempre seu recibo e as informações oficiais publicadas.</p>
      </footer>
    </div>
  );
}
