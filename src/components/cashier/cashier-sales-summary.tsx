"use client";

import { useCallback, useEffect, useState } from "react";

type Summary = {
  totalSalesCents: number;
  confirmedSalesCount: number;
  commissionCents: number;
  commissionRateBasisPoints: number;
};

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function CashierSalesSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/cashier/summary", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar o resumo.");
      setSummary(body as Summary);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao consultar o resumo.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    const interval = window.setInterval(() => { void load(); }, 30000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [load]);

  return <details className="player-collapsible-section cashier-summary-menu">
    <summary>
      <span className="player-collapsible-label">Financeiro</span>
      <span className="player-collapsible-title">Resumo financeiro</span>
      <span className="player-collapsible-hint">Acompanhe suas apostas e comissão</span>
    </summary>
    <section className="cashier-compact-summary" aria-label="Resumo financeiro do cambista">
      {error && <p role="alert" className="note-inline">{error}</p>}
      <div className="cashier-summary-grid">
        <article className="cashier-summary-tile">
          <span>Apostas</span>
          <strong>{summary ? money(summary.totalSalesCents) : "Carregando…"}</strong>
        </article>
        <article className="cashier-summary-tile">
          <span>Comissão</span>
          <strong>{summary ? money(summary.commissionCents) : "Carregando…"}</strong>
        </article>
      </div>
    </section>
  </details>;
}
