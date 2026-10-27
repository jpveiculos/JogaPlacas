"use client";

import { useEffect, useState } from "react";

type VerifiedPlate = {
  plateDisplay: string;
  plateFormat: string;
  resultStatus: "AGUARDANDO" | "PREMIADA" | "NAO_PREMIADA" | "AGUARDANDO_APURACAO";
  prizeCents: number | null;
  prizePaid: boolean;
};

type VerifiedRound = {
  roundCode: string;
  status: "RODADA_CANCELADA" | "RESULTADO_PUBLICADO" | "SORTEIO_AGUARDANDO" | "AGUARDANDO_RESULTADO_OFICIAL";
  startsAt: string;
  resultAt: string;
  resultLegacyPlate: string | null;
  resultMercosurPlate: string | null;
  plates: VerifiedPlate[];
};

type VerifiedReceipt = {
  valid: boolean;
  receiptCode?: string;
  status?: string;
  paymentMethod?: string;
  totalCents?: number;
  currency?: string;
  confirmedAt?: string | null;
  rounds?: VerifiedRound[];
  message: string;
};

const paymentLabels: Record<string, string> = { CASH: "Dinheiro", PIX: "Pix", WALLET: "Carteira" };
const roundStatusLabels: Record<VerifiedRound["status"], string> = {
  SORTEIO_AGUARDANDO: "Sorteio aguardando",
  AGUARDANDO_RESULTADO_OFICIAL: "Aguardando resultado oficial",
  RESULTADO_PUBLICADO: "Resultado oficial publicado",
  RODADA_CANCELADA: "Rodada cancelada",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

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
  const date = data?.confirmedAt ? formatDate(data.confirmedAt) : null;

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
          <h3>Rodadas e placas deste recibo</h3>
          {data.rounds?.length ? data.rounds.map((round) => (
            <article key={round.roundCode} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14, marginTop: 12 }}>
              <h4 style={{ marginTop: 0 }}>Rodada {round.roundCode}</h4>
              <p><strong>Situação:</strong> {roundStatusLabels[round.status]}</p>
              <p><strong>Horário programado:</strong> {formatDate(round.resultAt)}</p>
              {round.status === "RESULTADO_PUBLICADO" && (
                <div>
                  <p><strong>Resultado placa cinza:</strong> {round.resultLegacyPlate ?? "Não informado"}</p>
                  <p><strong>Resultado placa Mercosul:</strong> {round.resultMercosurPlate ?? "Não informado"}</p>
                </div>
              )}
              <ul>
                {round.plates.map((plate, index) => (
                  <li key={`${round.roundCode}-${plate.plateDisplay}-${index}`}>
                    <strong>{plate.plateDisplay}</strong> — {plate.plateFormat === "LEGACY" ? "Placa cinza" : "Placa Mercosul"}.
                    {" "}{plate.resultStatus === "AGUARDANDO" && "Resultado ainda não disponível."}
                    {plate.resultStatus === "AGUARDANDO_APURACAO" && "Resultado publicado; apuração do prêmio pendente."}
                    {plate.resultStatus === "NAO_PREMIADA" && "Não premiada nesta rodada."}
                    {plate.resultStatus === "PREMIADA" && (
                      <>Premiada: {money(plate.prizeCents ?? 0, data.currency ?? "BRL")}. {plate.prizePaid ? "Crédito do prêmio confirmado." : "Prêmio ainda não consta como creditado."}</>
                    )}
                  </li>
                ))}
              </ul>
              {round.status === "RESULTADO_PUBLICADO" && round.plates.length > 0 && round.plates.every((plate) => plate.resultStatus === "NAO_PREMIADA") && (
                <p><strong>Resultado publicado — este jogo não foi premiado nesta rodada.</strong></p>
              )}
            </article>
          )) : <p>Não há rodadas confirmadas vinculadas a este recibo.</p>}
          <p><strong>Importante:</strong> os dados vêm do sistema oficial. A consulta pública não é, sozinha, autorização para pagar um prêmio.</p>
        </>
      )}
    </section>
  );
}
