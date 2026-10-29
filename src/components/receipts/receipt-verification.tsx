"use client";

import { useEffect, useState } from "react";

type VerifiedPlate = {
  plateDisplay: string;
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
  SORTEIO_AGUARDANDO: "Em andamento",
  AGUARDANDO_RESULTADO_OFICIAL: "Aguardando resultado oficial",
  RESULTADO_PUBLICADO: "Publicado",
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
    let active = true;
    let requestController: AbortController | null = null;

    async function verify() {
      requestController?.abort();
      requestController = new AbortController();
      try {
        const response = await fetch(
          `/api/public/receipt-verification/${encodeURIComponent(receiptCode)}`,
          { cache: "no-store", signal: requestController.signal },
        );
        const body = await response.json() as VerifiedReceipt;
        if (active) setData(body);
      } catch {
        if (active && !requestController.signal.aborted) {
          setData({ valid: false, message: "Não foi possível verificar agora. Confira sua conexão e tente novamente." });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void verify();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void verify();
    }, 30_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void verify();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      active = false;
      requestController?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [receiptCode]);

  const money = (cents: number, currency = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);

  if (loading) return <p role="status">Consultando o registro oficial do recibo…</p>;
  if (!data) return <p role="alert">Não foi possível consultar o recibo.</p>;

  const rounds = data.valid ? data.rounds ?? [] : [];
  const hasPrize = rounds.some((round) => round.plates.some((plate) => plate.resultStatus === "PREMIADA"));
  const allRoundsResolved = rounds.length > 0 && rounds.every((round) =>
    round.status === "RESULTADO_PUBLICADO" || round.status === "RODADA_CANCELADA",
  );
  const noPrize = allRoundsResolved && rounds.every((round) =>
    round.plates.length > 0 && round.plates.every((plate) => plate.resultStatus === "NAO_PREMIADA"),
  );
  const overallLabel = !data.valid
    ? "RECIBO NÃO VALIDADO"
    : hasPrize
      ? "BILHETE PREMIADO"
      : noPrize
        ? "BILHETE NÃO PREMIADO"
        : "RESULTADO PENDENTE";
  const overallColor = !data.valid || noPrize ? "#b91c1c" : hasPrize ? "#15803d" : "#92400e";

  return (
    <section aria-live="polite" style={{ border: "1px solid #d1d5db", borderRadius: 12, padding: 20, background: "#fff", color: "#111827" }}>
      <div style={{ padding: "14px 12px", borderRadius: 8, background: overallColor, color: "#fff", textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{overallLabel}</h2>
      </div>
      <p>{data.message}</p>
      <p><strong>Código do recibo:</strong> {data.receiptCode ?? receiptCode.toUpperCase()}</p>
      {data.valid && (
        <>
          <p><strong>Valor registrado:</strong> {money(data.totalCents ?? 0, data.currency ?? "BRL")}</p>
          <p><strong>Pagamento:</strong> {paymentLabels[data.paymentMethod ?? ""] ?? "Confirmado"}</p>
          {data.confirmedAt && <p><strong>Pagamento confirmado em:</strong> {formatDate(data.confirmedAt)}</p>}

          <h3>Resultados das rodadas</h3>
          {rounds.length ? rounds.map((round) => (
            <article key={round.roundCode} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14, marginTop: 12 }}>
              <p><strong>Código da rodada:</strong> {round.roundCode}</p>
              <p><strong>Situação:</strong> {roundStatusLabels[round.status]}</p>
              <p><strong>Horário:</strong> {formatDate(round.resultAt)}</p>
              {round.status === "RESULTADO_PUBLICADO" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <strong>Placa sorteada</strong>
                    <div style={{ marginTop: 6, padding: "10px 6px", border: "1px solid #9ca3af", borderRadius: 6, textAlign: "center", fontSize: 18, fontWeight: 700 }}>
                      {round.resultLegacyPlate ?? "—"}
                    </div>
                  </div>
                  <div>
                    <strong>Placa sorteada</strong>
                    <div style={{ marginTop: 6, padding: "10px 6px", border: "1px solid #9ca3af", borderRadius: 6, textAlign: "center", fontSize: 18, fontWeight: 700 }}>
                      {round.resultMercosurPlate ?? "—"}
                    </div>
                  </div>
                </div>
              )}
            </article>
          )) : <p>Não há rodadas confirmadas vinculadas a este recibo.</p>}
          {hasPrize && (
            <p style={{ marginTop: 16, color: "#166534", fontWeight: 700 }}>
              O sistema identificou uma aposta premiada. Confira os detalhes com o atendimento oficial; esta consulta não confirma pagamento do prêmio.
            </p>
          )}
          <p style={{ marginTop: 20, fontSize: 13, color: "#4b5563" }}>
            As informações são consultadas no sistema oficial e atualizadas automaticamente enquanto esta página estiver aberta.
          </p>
        </>
      )}
    </section>
  );
}
