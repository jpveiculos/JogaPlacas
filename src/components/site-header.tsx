/** Cabeçalho visual público com cenário fotográfico e logomarca oficial sobreposta. */
export function SiteHeader() {
  return (
    <header className="site-header site-header-scenery" aria-label="Cabeçalho Joga Placa">
      <img
        className="site-header-scenery-image"
        src="/images/brand/header-cenario-joga-placa.PNG"
        alt="Cenário com carros e motocicletas em uma avenida ao pôr do sol."
        fetchPriority="high"
        decoding="async"
      />
      <img
        className="site-header-scenery-logo"
        src="/images/brand/joga-placa-logo.jpg"
        alt="Joga Placa"
        fetchPriority="high"
        decoding="async"
      />
    </header>
  );
}
