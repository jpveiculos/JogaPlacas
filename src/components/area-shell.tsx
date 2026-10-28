import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

type Props = { title: string; username: string; description?: string; compact?: boolean; logoOnlyHeader?: boolean; logoutAtBottom?: boolean; children: ReactNode };

export function AreaShell({ title, username, description, compact = false, logoOnlyHeader = false, logoutAtBottom = false, children }: Props) {
  return (
    <main className={compact ? "area-page area-page-compact" : "area-page"}>
      <header
        className="area-header"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          gridTemplateRows: compact ? "76px" : "76px auto",
          alignItems: "center",
          columnGap: 10,
          rowGap: compact ? 0 : 12,
          paddingBottom: 24,
        }}
      >
        {!logoOnlyHeader && <span
          className="account-name"
          style={{
            gridColumn: "1",
            gridRow: "1",
            justifySelf: "start",
            maxWidth: "100%",
            overflowWrap: "anywhere",
            zIndex: 2,
          }}
        >
          {username}
        </span>}
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
              height: "clamp(48px, 11vw, 76px)",
              maxWidth: "38vw",
              objectFit: "contain",
              transform: "none",
              filter: "none",
            }}
          />
        </a>
        {!logoOnlyHeader && <div
          className="account-controls"
          style={{
            gridColumn: "3",
            gridRow: "1",
            justifySelf: "end",
            width: "auto",
            minWidth: 0,
            position: "relative",
            zIndex: 2,
            gap: 10,
          }}
        >
          <LogoutButton />
        </div>}
        {!compact && (
          <div style={{ gridColumn: "1 / -1", gridRow: "2", minWidth: 0 }}>
            <h1 className="area-title">{title}</h1>
            {description && <p className="area-description">{description}</p>}
          </div>
        )}
      </header>
      <section className="area-content">{children}</section>
      {logoutAtBottom && (
        <footer className="area-logout-footer" style={{ display: "flex", justifyContent: "center", padding: "24px 0 32px" }}>
          <LogoutButton />
        </footer>
      )}
    </main>
  );
}
