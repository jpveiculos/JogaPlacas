import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joga Placas",
  description: "Plataforma de jogos de placas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
