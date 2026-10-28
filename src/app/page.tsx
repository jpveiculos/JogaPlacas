import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Joga Placas | Seu jogo e seu recibo",
  description: "Conheça o Joga Placas. Consulte seu recibo original pelo QR Code impresso.",
};

export default function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <Link href="/" className="home-brand home-wordmark" aria-label="Joga Placas — página inicial"><span className="wordmark-joga">JOGA</span><span className="wordmark-placas">PLACAS</span></Link>
        <nav className="home-nav" aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <Link className="home-login-button" href="/login">Entrar</Link>
          <Link className="home-login-button" href="/cadastro">Criar cadastro</Link>
        </nav>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-eyebrow">Seu jogo e seu recibo</p>
          <h1 id="home-title">Seu jogo. Seu recibo. <span>Consulte pelo QR Code.</span></h1>
          <p className="home-hero-description">Guarde seu recibo impresso. Para conferir a aposta, abra a câmera do celular e aponte para o QR Code do próprio recibo. A consulta mostra os dados oficiais daquela compra.</p>
          <div className="home-hero-actions">
            <a className="home-primary-button" href="#como-funciona">Como consultar pelo QR Code</a>
            <Link className="home-secondary-button" href="/login">Entrar na minha conta</Link>
            <Link className="home-secondary-button" href="/cadastro">Criar minha conta</Link>
          </div>
          <p className="home-small-note">A consulta é específica para o recibo escaneado. Não existe uma página geral de resultados para pesquisar apostas.</p>
        </div>
        <div className="home-hero-art" aria-label="Dois formatos de placa usados no jogo">
          <div className="home-plate-card"><span>PLACA CINZA</span><strong>ABC·1234</strong><small>Formato antigo</small></div>
          <div className="home-plate-card home-plate-mercosur"><span>PLACA MERCOSUL</span><strong>ABC1D23</strong><small>Formato Mercosul</small></div>
          <div className="home-hero-stamp">Confira<br />seu recibo</div>
        </div>
      </section>

      <section id="como-funciona" className="home-how-section" aria-labelledby="home-how-title">
        <div className="home-section-intro">
          <p className="home-eyebrow">Simples e direto</p>
          <h2 id="home-how-title">Como consultar seu recibo</h2>
          <p>A câmera do celular lê o QR Code impresso e abre a página de conferência daquele recibo específico.</p>
        </div>
        <div className="home-steps">
          <article><span>01</span><h3>Faça sua aposta</h3><p>Participe pela sua conta, quando disponível, ou jogue presencialmente com um cambista autorizado.</p></article>
          <article><span>02</span><h3>Guarde o recibo</h3><p>Confira se o recibo foi emitido e mantenha o código iniciado por JP- para consultar sua aposta.</p></article>
          <article><span>03</span><h3>Confira os dados</h3><p>A página aberta pelo QR Code mostra os dados registrados, o pagamento e as rodadas e resultados vinculados àquele recibo.</p></article>
        </div>
        <div className="home-rules-note">
          <strong>Placa cinza e placa Mercosul têm resultados independentes.</strong>
          <p>As categorias, equivalências e valores de prêmio devem seguir as regras oficiais vigentes do jogo. Consulte os termos publicados antes de participar; esta página não promete prêmio nem substitui a conferência do recibo.</p>
          <Link href="/termos-de-uso">Consultar termos de uso</Link>
        </div>
      </section>

      <footer className="home-footer">
        <Link href="/" className="home-brand home-wordmark" aria-label="Joga Placas — página inicial"><span className="wordmark-joga">JOGA</span><span className="wordmark-placas">PLACAS</span></Link>
        <div><Link href="/termos-de-uso">Termos de uso</Link><Link href="/login">Entrar</Link></div>
        <p>Guarde o recibo impresso. A consulta é feita pelo QR Code do próprio documento.</p>
      </footer>
    </div>
  );
}
