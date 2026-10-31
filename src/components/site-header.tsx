/** Cabeçalho visual público com cenário fotográfico e logomarca oficial sobreposta. */
const HEADER_IMAGE_BASE = "/images/brand/header-cenario-joga-placa";

function getImageExtensionVariants(extension: string): string[] {
  return extension.split("").reduce(
    (variants, character) => {
      const lower = character.toLowerCase();
      const upper = character.toUpperCase();
      return lower === upper
        ? variants.map((variant) => variant + character)
        : [
            ...variants.map((variant) => variant + lower),
            ...variants.map((variant) => variant + upper),
          ];
    },
    [""],
  );
}

const HEADER_IMAGE_EXTENSIONS = [
  "png", "jpg", "jpeg", "webp", "gif", "svg", "avif",
].flatMap((extension) =>
  getImageExtensionVariants(extension).map((variant) => "." + variant),
);

export function SiteHeader() {
  return (
    <header className="site-header site-header-scenery" aria-label="Cabeçalho Joga Placa">
      <img
        className="site-header-scenery-image"
        src={HEADER_IMAGE_BASE + HEADER_IMAGE_EXTENSIONS[0]}
        onError={(event) => {
          const image = event.currentTarget;
          const nextIndex = Number(image.dataset.extensionIndex ?? "0") + 1;
          if (nextIndex < HEADER_IMAGE_EXTENSIONS.length) {
            image.dataset.extensionIndex = String(nextIndex);
            image.src = HEADER_IMAGE_BASE + HEADER_IMAGE_EXTENSIONS[nextIndex];
          } else {
            image.onerror = null;
          }
        }}
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
