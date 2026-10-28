import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

type Props = {
  title: string;
  username: string;
  description?: string;
  compact?: boolean;
  logoOnlyHeader?: boolean;
  logoutAtBottom?: boolean;
  children: ReactNode;
};

export function AreaShell({ children, compact = false }: Props) {
  return (
    <main className={`area-page${compact ? " area-page-compact" : ""}`}>
      <header
        className="area-header"
        aria-label="Cabeçalho Joga Placa"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          gridTemplateRows: "76px",
          alignItems: "center",
          columnGap: 8,
          paddingBottom: 2,
        }}
      >
        <a
          href="/"
          aria-label="Joga Placa — página inicial"
          className="area-centered-logo"
          style={{
            gridColumn: "2",
            gridRow: "1",
            display: "block",
            lineHeight: 0,
            margin: 0,
            zIndex: 1,
          }}
        >
          <img
            src="/images/brand/joga-placa-logo.jpg"
            alt="Joga Placa"
            style={{
              display: "block",
              width: "auto",
              height: "clamp(64px, 15vw, 76px)",
              maxWidth: "72vw",
              objectFit: "contain",
              transform: "none",
              filter: "none",
            }}
          />
        </a>
      </header>
      <section className={`area-content${compact ? " area-content-compact" : ""}`}>{children}</section>
      <footer
        className="area-logout-footer"
        style={{ display: "flex", justifyContent: "center", padding: "24px 0 32px" }}
      >
        <LogoutButton />
      </footer>
    </main>
  );
}
