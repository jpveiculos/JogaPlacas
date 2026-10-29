import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  imageStyle?: React.CSSProperties;
  label?: string;
};

/** Logomarca oficial compartilhada por todas as áreas e páginas públicas. */
export function BrandLogo({
  className = "",
  imageClassName = "",
  imageStyle,
  label = "Joga Placa — página inicial",
}: BrandLogoProps) {
  return (
    <Link href="/" className={className} aria-label={label}>
      <img
        src="/images/brand/joga-placa-logo.jpg"
        alt="Joga Placa"
        className={imageClassName}
        style={{ display: "block", objectFit: "contain", ...imageStyle }}
      />
    </Link>
  );
}
