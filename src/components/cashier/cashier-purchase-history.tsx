"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { PlayerPurchaseReceipt } from "@/components/receipts/player-purchase-receipt";

type Purchase = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  providerStatus: string | null;
  providerStatusDetail: string | null;
  totalCents: number;
  currency: string;
  receiptCode: string | null;
  createdAt: string;
  confirmedAt: string | null;
  plates: string[];
  receiptReady: boolean;
};

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Pago / confirmado",
  CANCELLED: "Cancelada",
  REFUNDED: "Reembolsada",
  PENDING: "Pagamento pendente",
  FAILED: "Pagamento recusado",
  EXPIRED: "Pagamento expirado",
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function CashierPurchaseHistory() {
  const [query, setQuery] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receiptPurchaseId, setReceiptPurchaseId] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReceiptPurchaseId(null);
    try {
      const response = await fetch(`/api/cashier/purchases?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const body = await response.json() as { purchases?: Purchase[]; error?: string; message?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível pesquisar.");
      setPurchases(body.purchases ?? []);
      setSearched(true);
      if (body.message) setError(body.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível pesquisar agora.");
      setPurchases([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="feature-card">
      <span className="feature-label">Recuperação de recibo</span>
      <h2>Perdeu o recibo? Emitir segunda via</h2>
      <p>Pesquise uma venda feita por este cambista usando o código completo do recibo ou a placa completa que foi apostada. A busca fica limitada às vendas dos últimos 7 dias. Confira a data, o valor e as placas antes de abrir ou imprimir a segunda via.</p>
      <form onSubmit={search} className="cashier-purchase-search">
        <label htmlFor="cashier-purchase-query">Código do recibo ou placa completa</label>
        <div className="cashier-purchase-search-row">
          <input id="cashier-purchase-query" value={query} onChange={(event) => setQuery(event.target.value.toUpperCase())} maxLength={100} minLength={7} required placeholder="JP-AB12CD34 ou ABC-1234" autoComplete="off" />
          <button type="submit" disabled={loading || !(/^JP-[A-Z0-9]{8,32}$/i.test(query.trim()) || /^[A-Z]{3}-?\d{4}$/i.test(query.trim()) || /^[A-Z]{3}\d[A-Z]\d{2}$/i.test(query.trim().replaceAll("-", "")))}>{loading ? "Pesquisando…" : "Buscar segunda via"}</button>
        </div>
      </form>
      {error && <p className="note-inline" role="status">{error}</p>}
      {searched && !loading && purchases.length === 0 && !error && <p className="note-inline">Nenhuma compra encontrada para esta pesquisa.</p>}
      {purchases.length > 0 && (
        <div className="cashier-purchase-results" aria-live="polite">
          {purchases.map((purchase) => (
            <section className="cashier-purchase-result" key={purchase.id}>
              <div className="cashier-purchase-result-heading">
                <div>
                  <strong>{purchase.receiptCode ? "Venda registrada" : "Venda sem recibo"}</strong>
                  <p>{purchase.receiptCode ? `Recibo ${purchase.receiptCode}` : `Compra ${purchase.id}`}</p>
                </div>
                <strong>{money(purchase.totalCents)}</strong>
              </div>
              <p className="cashier-purchase-meta">Criada: {dateTime(purchase.createdAt)} · {purchase.paymentMethod === "PIX" ? "Pix" : purchase.paymentMethod === "CASH" ? "Dinheiro" : purchase.paymentMethod}</p>
              {purchase.plates.length > 0 && <p className="cashier-purchase-meta">Placas: {purchase.plates.join(", ")}</p>}
              <p><strong>Situação da compra:</strong> {statusLabels[purchase.status] ?? purchase.status}</p>
              <p><strong>Situação do pagamento:</strong> {statusLabels[purchase.paymentStatus] ?? purchase.paymentStatus}{purchase.providerStatus ? ` · Mercado Pago: ${purchase.providerStatus}` : ""}</p>
              {purchase.confirmedAt && <p className="cashier-purchase-meta">Pagamento confirmado: {dateTime(purchase.confirmedAt)}</p>}
              {purchase.receiptReady ? (
                <button type="button" onClick={() => setReceiptPurchaseId(purchase.id)}>Abrir / imprimir recibo {purchase.receiptCode ? `· ${purchase.receiptCode}` : ""}</button>
              ) : (
                <p className="note-inline">{purchase.status === "CANCELLED" || purchase.status === "REFUNDED" ? "Não é possível emitir recibo de pagamento confirmado para esta compra." : "O recibo oficial só fica disponível após a confirmação do pagamento."}</p>
              )}
            </section>
          ))}
        </div>
      )}
      {receiptPurchaseId && (
        <PlayerPurchaseReceipt
          purchaseId={receiptPurchaseId}
          autoOpen
          onClose={() => setReceiptPurchaseId(null)}
        />
      )}
    </article>
  );
}
