import { BrandLogo } from "@/components/brand-logo";

/** Cabeçalho único do produto: apenas a logomarca oficial, centralizada. */
export function SiteHeader() {
  return (
    <header className="site-header" aria-label="Cabeçalho Joga Placa">
      <BrandLogo className="site-header-brand" />
    </header>
  );
}