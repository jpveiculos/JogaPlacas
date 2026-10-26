"use client";

import { useState } from "react";
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

export function PlayerPurchaseReceipt({ purchaseId }: { purchaseId: string }) {
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

  return (
    <div className="player-purchase-receipt">
      {!receipt && (
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
            <button type="button" onClick={() => setReceipt(null)}>Fechar recibo</button>
          </section>
        </div>
      )}
    </div>
  );
}
