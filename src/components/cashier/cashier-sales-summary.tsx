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

  return <section className="feature-card" aria-labelledby="cashier-summary-heading">
    <span className="feature-label">Meu resultado</span>
    <h2 id="cashier-summary-heading">Vendas e comissão acumulada</h2>
    {error && <p role="alert" className="note-inline">{error}</p>}
    {!summary ? <p>Carregando seus totais…</p> : <>
      <div className="round-options">
        <article className="round-option">
          <span>Total das vendas confirmadas</span>
          <strong>{money(summary.totalSalesCents)}</strong>
          <p>{summary.confirmedSalesCount} venda(s) confirmada(s)</p>
        </article>
        <article className="round-option">
          <span>Minha comissão acumulada</span>
          <strong>{money(summary.commissionCents)}</strong>
          <p>Taxa atual: {(summary.commissionRateBasisPoints / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</p>
        </article>
      </div>
      <p className="note-inline">A comissão é mostrada em reais e calculada por venda confirmada, usando a taxa válida no momento da confirmação. Os totais são atualizados automaticamente.</p>
    </>}
  </section>;
}
