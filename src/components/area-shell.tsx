import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

type Props = { title: string; username: string; description: string; children: ReactNode };
export function AreaShell({ title, username, description, children }: Props) {
  return (
    <main className="area-page">
      <header className="area-header">
        <div><p className="eyebrow">Joga Placas</p><h1 className="area-title">{title}</h1><p className="area-description">{description}</p></div>
        <div className="account-controls"><span className="account-name">{username}</span><LogoutButton /></div>
      </header>
      <section className="area-content">{children}</section>
    </main>
  );
}