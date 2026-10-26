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
  plates: ThermalReceiptPlate[];
};

const paymentLabels: Record<string, string> = {
  PIX: "Pix confirmado",
  CASH: "Dinheiro recebido",
  CARD: "Cartão confirmado",
};

export function PlayerPurchaseReceipt({ purchaseId, autoOpen = false, onClose }: { purchaseId: string; autoOpen?: boolean; onClose?: () => void }) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReceipt() {
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoOpen) return;
    // Defer the initial fetch until after the effect commits so loading state
    // is updated from the async callback rather than synchronously in the effect.
    const timer = window.setTimeout(() => { void loadReceipt(); }, 0);
    return () => window.clearTimeout(timer);
    // The purchase ID is stable for this mounted receipt component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, purchaseId]);

  return (
    <div className="player-purchase-receipt">
      {!receipt && !autoOpen && (
        <button type="button" onClick={loadReceipt} disabled={loading}>
          {loading ? "Carregando recibo…" : "Consultar / imprimir recibo oficial"}
        </button>
      )}
      {error && <p className="note-inline" role="alert">{error}</p>}
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
              paymentLabel={paymentLabels[receipt.paymentMethod] ?? "Pagamento confirmado"}
            />
            <button type="button" onClick={() => { setReceipt(null); onClose?.(); }}>Fechar recibo</button>
          </section>
        </div>
      )}
    </div>
  );
}
