import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

type Props = { title: string; username: string; description?: string; compact?: boolean; children: ReactNode };

export function AreaShell({ title, username, description, compact = false, children }: Props) {
  return (
    <main className={compact ? "area-page area-page-compact" : "area-page"}>
      <header
        className="area-header"
        style={compact ? { position: "relative", alignItems: "center", minHeight: 76 } : undefined}
      >
        {compact && (
          <span
            className="account-name"
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              maxWidth: "25%",
              overflowWrap: "anywhere",
              zIndex: 2,
            }}
          >
            {username}
          </span>
        )}
        <div className="area-header-branding" style={compact ? { flex: "1 1 100%", minWidth: 0 } : undefined}>
          <a
            href="/"
            aria-label="Joga Placa — página inicial"
            className={compact ? "area-centered-logo" : "home-brand home-wordmark"}
            style={compact ? {
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "block",
              lineHeight: 0,
              margin: 0,
              zIndex: 1,
            } : undefined}
          >
            <img
              src="/images/brand/joga-placa-logo.jpg"
              alt="Joga Placa"
              style={compact ? {
                display: "block",
                width: "auto",
                height: "clamp(48px, 11vw, 76px)",
                maxWidth: "38vw",
                objectFit: "contain",
                transform: "none",
                filter: "none",
              } : undefined}
            />
          </a>
          {!compact && (
            <>
              <h1 className="area-title">{title}</h1>
              {description && <p className="area-description">{description}</p>}
            </>
          )}
        </div>
        <div className="account-controls" style={compact ? { width: "auto", flex: "0 0 auto", justifyContent: "flex-end", marginLeft: "auto", position: "relative", zIndex: 2, gap: 10 } : undefined}>
          {!compact && <span className="account-name">{username}</span>}
          <LogoutButton />
        </div>
      </header>
      <section className="area-content">{children}</section>
    </main>
  );
}
