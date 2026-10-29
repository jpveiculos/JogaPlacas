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

const roundStatusLabels: Record<VerifiedRound["status"], string> = {
  SORTEIO_AGUARDANDO: "Em andamento",
  AGUARDANDO_RESULTADO_OFICIAL: "Aguardando resultado",
  RESULTADO_PUBLICADO: "Publicado",
  RODADA_CANCELADA: "Cancelada",
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
          setData({ valid: false, message: "Não foi possível consultar. Tente novamente." });
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

  if (loading) return <p role="status" style={{ color: "#111827", fontWeight: 700 }}>Consultando recibo…</p>;
  if (!data) return <p role="alert" style={{ color: "#b91c1c", fontWeight: 700 }}>Não foi possível consultar o recibo.</p>;

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
    <section aria-live="polite" style={{ border: "2px solid #9ca3af", borderRadius: 10, padding: 16, background: "#ffffff", color: "#111827", fontSize: 16, lineHeight: 1.5 }}>
      <div style={{ padding: "13px 10px", borderRadius: 7, background: overallColor, color: "#ffffff", textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "0.02em" }}>{overallLabel}</h2>
      </div>
      {!data.valid && <p role="alert" style={{ color: "#991b1b", fontWeight: 700 }}>{data.message}</p>}
      <p style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}><strong>Recibo:</strong> {data.receiptCode ?? receiptCode.toUpperCase()}</p>

      {data.valid && (
        <>
          <h3 style={{ margin: "0 0 10px", fontSize: 19, color: "#111827", fontWeight: 800 }}>Resultados</h3>
          {rounds.length ? rounds.map((round) => (
            <article key={round.roundCode} style={{ border: "1px solid #9ca3af", borderRadius: 8, padding: 13, marginTop: 10, background: "#ffffff", color: "#111827" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 17, color: "#111827" }}>{round.roundCode}</strong>
                <span style={{
                  display: "inline-block",
                  borderRadius: 5,
                  padding: "3px 8px",
                  fontSize: 14,
                  fontWeight: 800,
                  color: round.status === "RESULTADO_PUBLICADO" ? "#166534" : round.status === "RODADA_CANCELADA" ? "#991b1b" : "#854d0e",
                  background: round.status === "RESULTADO_PUBLICADO" ? "#dcfce7" : round.status === "RODADA_CANCELADA" ? "#fee2e2" : "#fef3c7",
                }}>{roundStatusLabels[round.status]}</span>
              </div>
              <p style={{ margin: "0 0 10px", color: "#374151", fontSize: 14 }}><strong>Horário:</strong> {formatDate(round.resultAt)}</p>
              {round.status === "RESULTADO_PUBLICADO" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[round.resultLegacyPlate, round.resultMercosurPlate].map((plate, index) => (
                    <div key={index}>
                      <strong style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 4 }}>Placa sorteada</strong>
                      <div style={{ padding: "11px 5px", border: "2px solid #6b7280", borderRadius: 6, textAlign: "center", fontSize: 19, color: "#111827", fontWeight: 800, background: "#f9fafb", overflowWrap: "anywhere" }}>
                        {plate ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {round.plates.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ display: "block", color: "#111827", marginBottom: 6 }}>Suas placas</strong>
                  <div style={{ display: "grid", gap: 6 }}>
                    {round.plates.map((plate, index) => {
                      const status = plate.resultStatus === "PREMIADA"
                        ? (plate.prizePaid ? "Prêmio pago" : "Premiada")
                        : plate.resultStatus === "NAO_PREMIADA"
                          ? "Não premiada"
                          : plate.resultStatus === "AGUARDANDO_APURACAO"
                            ? "Apuração pendente"
                            : "Aguardando resultado";
                      const statusColor = plate.resultStatus === "PREMIADA"
                        ? "#166534"
                        : plate.resultStatus === "NAO_PREMIADA"
                          ? "#991b1b"
                          : "#854d0e";
                      return (
                        <div key={`${round.roundCode}-${plate.plateDisplay}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "8px 10px", borderRadius: 6, background: "#f3f4f6", border: "1px solid #d1d5db" }}>
                          <strong style={{ color: "#111827", fontSize: 16 }}>{plate.plateDisplay}</strong>
                          <span style={{ color: statusColor, fontWeight: 800, fontSize: 14 }}>{status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          )) : <p style={{ color: "#374151" }}>Nenhuma rodada confirmada para este recibo.</p>}
        </>
      )}
    </section>
  );
}
