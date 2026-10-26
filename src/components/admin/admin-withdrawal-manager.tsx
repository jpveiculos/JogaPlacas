"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string; username: string; amountCents: number;
  status: "PENDING" | "APPROVED" | "PROCESSING" | "PAID" | "REJECTED";
  pixKey: string | null; pixKeyMasked: string; providerRef: string | null;
  createdAt: string; updatedAt: string; reviewedBy: string | null;
  statusHistory: Array<{ fromStatus: string | null; toStatus: string; note: string | null; createdAt: string; actor: string }>;
};
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo", hourCycle: "h23" }).format(new Date(value));
const labels: Record<Item["status"], string> = { PENDING: "Pendente — aguardando aprovação", APPROVED: "Aprovado — aguardando pagamento Pix externo", PROCESSING: "Em processamento", PAID: "Pago / baixado", REJECTED: "Recusado / reserva liberada" };

export function AdminWithdrawalManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/withdrawals", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar os saques.");
      setItems(body.items);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao consultar os saques."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function act(item: Item, action: "approve" | "mark-paid" | "reject") {
    const note = (notes[item.id] ?? "").trim();
    const providerRef = (references[item.id] ?? "").trim();
    if (note.length < 4) { setError("Registre uma observação para auditar a operação."); return; }
    const prompt = action === "approve"
      ? `Confirma aprovar a solicitação de saque de ${money(item.amountCents)} de ${item.username}? Isso não realiza o Pix.`
      : action === "mark-paid"
        ? `Confirma que o Pix de ${money(item.amountCents)} para ${item.username} foi transferido e conferido fora da plataforma?`
        : `Confirma recusar o saque de ${money(item.amountCents)} de ${item.username} e liberar o valor reservado na carteira?`;
    if (!window.confirm(prompt)) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/withdrawals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ withdrawalId: item.id, action, note, ...(action === "mark-paid" && providerRef.length >= 3 ? { providerRef } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível atualizar o saque.");
      setNotice(action === "approve"
        ? `Saque de ${money(body.withdrawal.amountCents)} de ${body.withdrawal.username} aprovado. O Pix ainda precisa ser realizado manualmente.`
        : action === "mark-paid"
          ? `Pagamento Pix externo de ${money(body.withdrawal.amountCents)} de ${body.withdrawal.username} registrado após conferência.`
          : `Saque recusado. A reserva de ${money(body.withdrawal.amountCents)} foi liberada na carteira do jogador.`);
      setNotes((current) => ({ ...current, [item.id]: "" }));
      setReferences((current) => ({ ...current, [item.id]: "" }));
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao atualizar o saque."); }
    finally { setBusy(null); }
  }

  const pending = items.filter((item) => item.status === "PENDING");
  const approved = items.filter((item) => item.status === "APPROVED");
  const history = items.filter((item) => !["PENDING", "APPROVED"].includes(item.status));

  return <section className="feature-card" aria-labelledby="admin-withdrawals-heading">
    <span className="feature-label">Financeiro</span>
    <h2 id="admin-withdrawals-heading">Saques das carteiras digitais</h2>
    <p>O botão “Aprovar saque” apenas aprova a solicitação. Depois de realizar e conferir o Pix fora da plataforma, use “Registrar pagamento realizado” na lista de aprovados. Nenhum botão envia Pix automaticamente. Em caso de recusa antes da aprovação, a reserva é liberada por lançamento compensatório auditável.</p>
    {error && <p role="alert" className="note-inline">{error}</p>}
    {notice && <p role="status" className="note-inline">{notice}</p>}
    {loading ? <p>Carregando solicitações…</p> : pending.length === 0 ? <p>Não há saques aguardando aprovação.</p> : <div className="admin-round-list">
      {pending.map((item) => <article className="round-option" key={item.id}>
        <div><strong>{item.username}</strong> · {money(item.amountCents)} · {labels[item.status]}</div>
        <p>Solicitado em {dateTime(item.createdAt)}</p>
        <p>Chave Pix para pagamento: <strong>{item.pixKey ?? item.pixKeyMasked}</strong></p>
        <label>Observação de auditoria
          <textarea rows={2} maxLength={500} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Ex.: solicitação conferida e aprovada." />
        </label>
        <div className="round-options">
          <button type="button" disabled={busy !== null} onClick={() => void act(item, "approve")}>{busy === item.id ? "Registrando…" : "Aprovar saque"}</button>
          <button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void act(item, "reject")}>Recusar e liberar saldo</button>
        </div>
      </article>)}
    </div>}
    <h3>Saques aprovados — aguardando pagamento externo</h3>
    {loading ? <p>Carregando saques aprovados…</p> : approved.length === 0 ? <p>Nenhum saque aprovado aguardando pagamento Pix.</p> : <div className="admin-round-list">
      {approved.map((item) => <article className="round-option" key={item.id}>
        <div><strong>{item.username}</strong> · {money(item.amountCents)} · {labels[item.status]}</div>
        <p>Solicitado em {dateTime(item.createdAt)} · Revisado por: {item.reviewedBy ?? "—"}</p>
        <p>Chave Pix para pagamento: <strong>{item.pixKey ?? item.pixKeyMasked}</strong></p>
        <label>Referência externa do Pix (opcional)
          <input value={references[item.id] ?? ""} onChange={(event) => setReferences((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={200} placeholder="Referência do comprovante, se disponível" />
        </label>
        <label>Observação de auditoria
          <textarea rows={2} maxLength={500} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Ex.: Pix transferido e conferido no banco." />
        </label>
        <button type="button" disabled={busy !== null} onClick={() => void act(item, "mark-paid")}>{busy === item.id ? "Registrando…" : "Registrar pagamento realizado"}</button>
        {item.statusHistory.map((event, index) => <p key={item.id + event.createdAt + index}><small>{dateTime(event.createdAt)} · {event.actor} · {event.note ?? labels[event.toStatus as Item["status"]]}</small></p>)}
      </article>)}
    </div>}
    <h3>Histórico de saques</h3>
    {loading ? <p>Carregando histórico…</p> : history.length === 0 ? <p>Nenhum saque encerrado.</p> : <div className="admin-round-list">
      {history.map((item) => <article className="round-option" key={item.id}>
        <div><strong>{item.username}</strong> · {money(item.amountCents)} · {labels[item.status]}</div>
        <p>Solicitado em {dateTime(item.createdAt)}{item.providerRef ? " · Referência: " + item.providerRef : ""}</p>
        <p>Revisado por: {item.reviewedBy ?? "—"}</p>
        {item.statusHistory.map((event, index) => <p key={item.id + event.createdAt + index}><small>{dateTime(event.createdAt)} · {event.actor} · {event.note ?? labels[event.toStatus as Item["status"]]}</small></p>)}
      </article>)}
    </div>}
    <button type="button" className="secondary-button" disabled={loading || busy !== null} onClick={() => void load()}>Atualizar saques</button>
  </section>;
}
