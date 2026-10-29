"use client";

import { useCallback, useEffect, useState } from "react";
import { PlateVisual } from "@/components/plates/plate-visual";

type Round = {
  id: string; code: string; startsAt: string; cutoffAt: string; resultAt: string;
  status: "SCHEDULED" | "OPEN" | "CLOSED" | "COMPLETED" | "CANCELLED";
  resultLegacyPlate: string | null; resultMercosurPlate: string | null; participationCount: number;
};
type Dashboard = { rounds: Round[]; summary: { pendingPayments: number; confirmedPurchases: number } };
const formatDate = (value: string) => {
  const date = new Date(value);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "Etc/GMT+3" }).format(date);
  const timeLabel = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Etc/GMT+3" }).format(date);
  return `${dateLabel} ${timeLabel}`;
};
const statusLabels: Record<Round["status"], string> = {
  SCHEDULED: "Programada", OPEN: "Aberta", CLOSED: "Fechada", COMPLETED: "Sorteada", CANCELLED: "Cancelada",
};

export function AdminRoundManager() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [startsAtInput, setStartsAtInput] = useState("");
  const [resultAtInput, setResultAtInput] = useState("");

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

  function brasiliaWallTimeToIso(value: string): string | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const [, y, mo, d, h, mi] = match;
    const desired = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
    let candidate = desired;
    for (let index = 0; index < 3; index += 1) {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Etc/GMT+3", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(candidate));
      const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      const represented = Date.UTC(Number(fields.year), Number(fields.month) - 1, Number(fields.day), Number(fields.hour), Number(fields.minute), Number(fields.second));
      candidate += desired - represented;
    }
    const check = new Intl.DateTimeFormat("en-CA", { timeZone: "Etc/GMT+3", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(candidate));
    const fields = Object.fromEntries(check.map((part) => [part.type, part.value]));
    return Number(fields.year) === Number(y) && Number(fields.month) === Number(mo) && Number(fields.day) === Number(d) && Number(fields.hour) === Number(h) && Number(fields.minute) === Number(mi)
      ? new Date(candidate).toISOString() : null;
  }

  async function createRound(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const startsAt = brasiliaWallTimeToIso(startsAtInput);
    const resultAt = brasiliaWallTimeToIso(resultAtInput);
    if (!startsAt || !resultAt) { setError("Informe horários válidos no horário de Brasília (UTC−03:00)."); return; }
    setBusy("create");
    try {
      const response = await fetch("/api/admin/rounds", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt, resultAt }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível criar a rodada.");
      setNotice("Rodada " + body.round.code + " criada. As apostas fecham um minuto antes do resultado.");
      setStartsAtInput(""); setResultAtInput(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao criar rodada."); }
    finally { setBusy(null); }
  }

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
    {false && (
      <form className="admin-round-create" onSubmit={createRound}>
        <h3>Criar uma rodada</h3>
        <p>Informe os horários no horário de Brasília <strong>(UTC−03:00)</strong>. O início deve ser 29 minutos antes do resultado, que acontece nos minutos :00 ou :30. O sistema fecha as apostas um minuto antes do sorteio.</p>
        <label>Início da rodada <input type="datetime-local" value={startsAtInput} onChange={(event) => setStartsAtInput(event.target.value)} required /></label>
        <label>Horário do resultado <input type="datetime-local" value={resultAtInput} onChange={(event) => setResultAtInput(event.target.value)} required /></label>
        <button type="submit" disabled={busy !== null}>{busy === "create" ? "Criando…" : "Criar rodada"}</button>
      </form>
    )}


    <div className="form-feedback-slot" aria-live="polite">
      {error && <p role="alert" className="note-inline form-feedback-error" aria-live="assertive">{error}</p>}
      {notice && <p role="status" className="note-inline form-feedback-success" aria-live="polite">{notice}</p>}
    </div>
    {data && <div className="round-options">
      <article className="round-option"><strong>{data.summary.pendingPayments}</strong><br />Compras aguardando pagamento</article>
      <article className="round-option"><strong>{data.summary.confirmedPurchases}</strong><br />Compras confirmadas</article>
    </div>}
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
