"use client";

import { useEffect, useState } from "react";

type VerifiedReceipt = {
  valid: boolean;
  receiptCode?: string;
  status?: string;
  paymentMethod?: string;
  totalCents?: number;
  currency?: string;
  confirmedAt?: string | null;
  plates?: Array<{ plateDisplay: string; plateFormat: string; roundCode: string }>;
  message: string;
};

const paymentLabels: Record<string, string> = { CASH: "Dinheiro", PIX: "Pix", WALLET: "Carteira" };

export function ReceiptVerification({ receiptCode }: { receiptCode: string }) {
  const [data, setData] = useState<VerifiedReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function verify() {
      try {
        const response = await fetch(`/api/public/receipt-verification/${encodeURIComponent(receiptCode)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json() as VerifiedReceipt;
        setData(body);
      } catch {
        if (!controller.signal.aborted) setData({ valid: false, message: "Não foi possível verificar agora. Confira sua conexão e tente novamente." });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void verify();
    return () => controller.abort();
  }, [receiptCode]);

  const money = (cents: number, currency = "BRL") => new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
  const date = data?.confirmedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(data.confirmedAt)) : null;

  if (loading) return <p role="status">Consultando o registro oficial do recibo…</p>;
  if (!data) return <p role="alert">Não foi possível consultar o recibo.</p>;

  return (
    <section aria-live="polite" style={{ border: "1px solid #d1d5db", borderRadius: 12, padding: 20, background: "#fff", color: "#111827" }}>
      <h2 style={{ marginTop: 0, color: data.valid ? "#166534" : "#991b1b" }}>
        {data.valid ? "✓ RECIBO VÁLIDO — PAGAMENTO CONFIRMADO" : "⚠ RECIBO NÃO VALIDADO"}
      </h2>
      <p>{data.message}</p>
      <p><strong>Código:</strong> {data.receiptCode ?? receiptCode.toUpperCase()}</p>
      {data.valid && (
        <>
          <p><strong>Valor registrado:</strong> {money(data.totalCents ?? 0, data.currency ?? "BRL")}</p>
          <p><strong>Pagamento:</strong> {paymentLabels[data.paymentMethod ?? ""] ?? "Confirmado"}</p>
          {date && <p><strong>Data de confirmação:</strong> {date}</p>}
          <h3>Placas registradas</h3>
          {data.plates?.length ? (
            <ul>{data.plates.map((plate, index) => (
              <li key={`${plate.roundCode}-${plate.plateDisplay}-${index}`}>
                {plate.plateDisplay} — {plate.plateFormat === "LEGACY" ? "Placa cinza" : "Placa Mercosul"} — Rodada {plate.roundCode}
              </li>
            ))}</ul>
          ) : <p>Não há placas confirmadas vinculadas a este recibo.</p>}
          <p><strong>Importante:</strong> esta consulta confirma o registro e o pagamento. Não confirma, por si só, a existência ou o pagamento de um prêmio.</p>
        </>
      )}
    </section>
  );
}
