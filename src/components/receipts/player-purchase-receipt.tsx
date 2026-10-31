"use client";

import { useEffect, useState } from "react";
import { ThermalReceipt } from "@/components/receipts/thermal-receipt";
import type { ThermalReceiptPlate } from "@/components/receipts/thermal-receipt-types";

type ReceiptData = {
  receiptCode: string;
  paymentStatus: "CONFIRMED";
  issuedAt: string;
  paymentMethod: string;
  totalCents: number;
  currency: string;
  customerLabel: string | null;
  plates: ThermalReceiptPlate[];
};

const paymentLabels: Record<string, string> = {
  PIX: "Pix confirmado",
  CASH: "Dinheiro recebido",
  WALLET: "Saldo da conta debitado",
  CARD: "Cartão confirmado",
};

const MAX_MANUAL_RETRIES = 2;

export function PlayerPurchaseReceipt({ purchaseId, autoOpen = false, onClose }: { purchaseId: string; autoOpen?: boolean; onClose?: () => void }) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualRetries, setManualRetries] = useState(0);

  async function loadReceipt(isManualRetry = false) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/player/purchases/${encodeURIComponent(purchaseId)}/receipt`, {
        cache: "no-store",
      });
      const body = await response.json() as { receipt?: ReceiptData; error?: string };
      if (!response.ok || !body.receipt) {
        throw new Error(body.error ?? "Não foi possível carregar o recibo.");
      }
      setReceipt(body.receipt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o recibo.");
      if (isManualRetry) setManualRetries((count) => count + 1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoOpen) return;
    const timer = window.setTimeout(() => { void loadReceipt(); }, 0);
    return () => window.clearTimeout(timer);
    // The purchase ID is stable for this mounted receipt component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, purchaseId]);

  const canRetry = manualRetries < MAX_MANUAL_RETRIES;

  return (
    <div className="player-purchase-receipt">
      {!receipt && !autoOpen && (
        <button type="button" onClick={() => { void loadReceipt(); }} disabled={loading}>
          {loading ? "Carregando recibo…" : "Consultar / imprimir recibo oficial"}
        </button>
      )}
      {error && (
        <div className="note-inline" role="alert">
          <p>{error}</p>
          <p>Referência da venda: <strong>{purchaseId}</strong>. Informe esse código à administração se o recibo continuar indisponível.</p>
          {canRetry ? (
            <button type="button" onClick={() => { void loadReceipt(true); }} disabled={loading}>
              {loading ? "Consultando…" : `Tentar buscar recibo novamente (${manualRetries + 1}/${MAX_MANUAL_RETRIES})`}
            </button>
          ) : (
            <p>As tentativas foram concluídas. Encaminhe a referência acima à administração para recuperar o recibo original. Não faça outra venda nem outro pagamento.</p>
          )}
        </div>
      )}
      {receipt && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-heading">
            <h2 id="receipt-heading">Recibo oficial</h2>
            <ThermalReceipt
              receiptCode={receipt.receiptCode}
              paymentStatus={receipt.paymentStatus}
              issuedAt={receipt.issuedAt}
              totalCents={receipt.totalCents}
              plates={receipt.plates}
              customerLabel={receipt.customerLabel}
              paymentLabel={paymentLabels[receipt.paymentMethod] ?? "Pagamento confirmado"}
              onClose={() => { setReceipt(null); onClose?.(); }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
