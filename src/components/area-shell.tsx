import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

type Props = { title: string; username: string; description?: string; compact?: boolean; children: ReactNode };
export function AreaShell({ title, username, description, compact = false, children }: Props) {
  return (
    <main className={compact ? "area-page area-page-compact" : "area-page"}>
      <header className="area-header">
        <div className="area-header-branding"><a href="/" className="home-brand home-wordmark" aria-label="Joga Placas — página inicial"><img src="/images/brand/joga-placa-logo.jpg" alt="Joga Placa" /></a>{!compact && <><h1 className="area-title">{title}</h1>{description && <p className="area-description">{description}</p>}</>}</div>
        <div className="account-controls">{!compact && <span className="account-name">{username}</span>}<LogoutButton /></div>
      </header>
      <section className="area-content">{children}</section>
    </main>
  );
}
