import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLogo } from "@/components/brand-logo";

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
        <BrandLogo
          className="area-centered-logo"
          imageStyle={{
            width: "auto",
            height: "clamp(64px, 15vw, 76px)",
            maxWidth: "72vw",
          }}
        />
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
