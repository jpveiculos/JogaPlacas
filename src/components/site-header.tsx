/** Cabeçalho visual da página pública com carros e motos nas laterais. */
export function SiteHeader() {
  return (
    <header className="site-header site-header-scenery" aria-label="Cabeçalho Joga Placa">
      <img
        className="site-header-scenery-image"
        src="/images/brand/header-cars-motorcycles.svg"
        alt="Joga Placa ao centro, com carros e motos dos dois lados em um cenário azul."
        fetchPriority="high"
        decoding="async"
      />
    </header>
  );
}
