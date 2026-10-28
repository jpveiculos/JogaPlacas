import type { Metadata, Viewport } from "next";
import "./globals.css";

const logo = "/images/brand/joga-placa-logo.jpg";

export const metadata: Metadata = {
  title: {
    default: "Joga Placa",
    template: "%s | Joga Placa",
  },
  description: "Plataforma Joga Placa: apostas, recibos e consulta de resultados das placas cinza e Mercosul.",
  applicationName: "Joga Placa",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Joga Placa",
  },
  icons: {
    icon: [{ url: logo, type: "image/jpeg" }],
    apple: [{ url: logo, type: "image/jpeg" }],
    shortcut: [{ url: logo, type: "image/jpeg" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Joga Placa",
    title: "Joga Placa",
    description: "Consulte recibos e acompanhe os resultados publicados.",
    images: [{ url: logo, alt: "Logomarca Joga Placa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Joga Placa",
    description: "Consulte recibos e acompanhe os resultados publicados.",
    images: [logo],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#10141d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
