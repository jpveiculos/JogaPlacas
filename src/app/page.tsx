export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="welcome-card" aria-labelledby="page-title">
        <p className="eyebrow">Plataforma de jogos de placas</p>
        <h1 id="page-title">Joga Placas</h1>
        <p className="intro">
          Uma base nova, organizada e segura para as áreas de jogador,
          cambista e administração.
        </p>
        <div className="status-badge">
          <span className="status-dot" aria-hidden="true" />
          Fundação do projeto em preparação
        </div>
        <p className="note">
          Esta versão inicial ainda não recebe apostas nem pagamentos.
        </p>
      </section>
    </main>
  );
}
