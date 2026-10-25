"use client";

import { useCallback, useEffect, useState } from "react";
import { PlateVisual } from "@/components/plates/plate-visual";

type Round = {
  id: string; code: string; startsAt: string; cutoffAt: string; resultAt: string;
  status: "SCHEDULED" | "OPEN" | "CLOSED" | "COMPLETED" | "CANCELLED";
  resultLegacyPlate: string | null; resultMercosurPlate: string | null; participationCount: number;
};
type Dashboard = { rounds: Round[]; summary: { pendingPayments: number; confirmedPurchases: number } };
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
const statusLabels: Record<Round["status"], string> = {
  SCHEDULED: "Programada", OPEN: "Aberta", CLOSED: "Fechada", COMPLETED: "Sorteada", CANCELLED: "Cancelada",
};

export function AdminRoundManager() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/rounds", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar as rodadas.");
      setData(body as Dashboard);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar o painel.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function perform(round: Round, action: "close" | "draw" | "settle") {
    const labels = { close: "fechar as apostas desta rodada", draw: "sortear os dois resultados desta rodada", settle: "apurar os prêmios desta rodada" };
    if (!window.confirm("Confirma " + labels[action] + " " + round.code + "?")) return;
    setBusy(round.id + action); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/rounds/" + encodeURIComponent(round.id) + "/" + action, {
        method: "POST", headers: { "content-type": "application/json" }, body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "A operação não foi concluída.");
      setNotice(action === "close" ? "Rodada fechada." : action === "draw" ? "Os dois resultados foram publicados." : "Apuração concluída.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao executar a operação.");
    } finally { setBusy(null); }
  }

  return <section className="feature-card" aria-labelledby="admin-rounds-heading">
    <span className="feature-label">Operação</span>
    <h2 id="admin-rounds-heading">Rodadas e resultados</h2>
    <p>As ações são verificadas novamente no servidor. O sorteio só fica disponível após o fechamento e no horário programado; a apuração exige os dois resultados publicados.</p>
    {data && <div className="round-options">
      <article className="round-option"><strong>{data.summary.pendingPayments}</strong><br />Compras aguardando pagamento</article>
      <article className="round-option"><strong>{data.summary.confirmedPurchases}</strong><br />Compras confirmadas</article>
    </div>}
    {error && <p role="alert" className="note-inline">{error}</p>}
    {notice && <p role="status" className="note-inline">{notice}</p>}
    {loading ? <p>Carregando rodadas…</p> : !data || data.rounds.length === 0 ? <p>Não há rodadas cadastradas.</p> : <div className="admin-round-list">
      {data.rounds.map((round) => <article className="round-option" key={round.id}>
        <div><strong>{round.code}</strong> · {statusLabels[round.status]}</div>
        <p>Início: {formatDate(round.startsAt)} · Fechamento: {formatDate(round.cutoffAt)} · Resultado: {formatDate(round.resultAt)}</p>
        <p>Participações registradas: {round.participationCount}</p>
        {round.resultLegacyPlate && round.resultMercosurPlate && <div className="round-options">
          <div><small>Placa cinza</small><PlateVisual format="LEGACY" value={round.resultLegacyPlate} /></div>
          <div><small>Placa Mercosul</small><PlateVisual format="MERCOSUR" value={round.resultMercosurPlate} /></div>
        </div>}
        <div className="round-options">
          {(round.status === "SCHEDULED" || round.status === "OPEN") && <button type="button" disabled={busy !== null} onClick={() => void perform(round, "close")}>{busy === round.id + "close" ? "Fechando…" : "Fechar apostas"}</button>}
          {round.status === "CLOSED" && <button type="button" disabled={busy !== null} onClick={() => void perform(round, "draw")}>{busy === round.id + "draw" ? "Sorteando…" : "Sortear placas"}</button>}
          {round.status === "COMPLETED" && <button type="button" disabled={busy !== null} onClick={() => void perform(round, "settle")}>{busy === round.id + "settle" ? "Apurando…" : "Apurar prêmios"}</button>}
        </div>
      </article>)}
    </div>}
    <button type="button" className="secondary-button" disabled={loading || busy !== null} onClick={() => void load()}>Atualizar painel</button>
  </section>;
}
