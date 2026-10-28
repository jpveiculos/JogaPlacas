"use client";

import { useCallback, useEffect, useState } from "react";

type Withdrawal = {
  id: string; amountCents: number; status: "PENDING" | "APPROVED" | "PROCESSING" | "PAID" | "REJECTED";
  providerRef: string | null; createdAt: string; updatedAt: string;
  statusHistory: Array<{ toStatus: string; note: string | null; createdAt: string }>;
};
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo", hourCycle: "h23" }).format(new Date(value));
const labels: Record<Withdrawal["status"], string> = { PENDING: "Pendente", APPROVED: "Estado antigo — contate o administrador", PROCESSING: "Estado antigo — contate o administrador", PAID: "Pago", REJECTED: "Recusado — saldo liberado" };

export function PlayerWalletWithdrawals() {
  const [availableCents, setAvailableCents] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [pixKey, setPixKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/player/withdrawals", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar a carteira.");
      setAvailableCents(body.availableCents);
      setWithdrawals(body.withdrawals);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao consultar a carteira."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function requestWithdrawal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (availableCents <= 0) { setError("Não há saldo disponível para sacar."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/player/withdrawals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pixKey: pixKey.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível solicitar o saque.");
      setNotice("Solicitação registrada. O valor foi reservado e não poderá ser usado em novas apostas enquanto o saque estiver pendente. Se o saque for rejeitado, o valor volta ao saldo disponível.");
      setPixKey(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao solicitar o saque."); }
    finally { setBusy(false); }
  }

  return <section className="feature-card" aria-labelledby="player-wallet-withdrawals-heading">
    <span className="feature-label">Carteira digital</span>
    <h2 id="player-wallet-withdrawals-heading">Saldo e saques</h2>
    <p className="wallet-balance">{loading ? "Consultando saldo…" : money(availableCents)} <small>disponível</small></p>
    <form className="admin-round-create" onSubmit={requestWithdrawal}>
      <p className="wallet-withdrawal-full-balance">O saque será do saldo total disponível: <strong>{loading ? "consultando…" : money(availableCents)}</strong>.</p>
      <label>Chave Pix<input value={pixKey} onChange={(event) => setPixKey(event.target.value)} maxLength={200} autoComplete="off" required /></label>
      <button type="submit" disabled={loading || busy || availableCents <= 0}>{busy ? "Solicitando…" : "Solicitar saque"}</button>
    </form>
    {error && <p role="alert" className="note-inline">{error}</p>}
    {notice && <p role="status" className="note-inline">{notice}</p>}
    <h3>Histórico de saques</h3>
    {loading ? <p>Carregando histórico…</p> : withdrawals.length === 0 ? <p>Nenhum saque solicitado ainda.</p> : <div className="admin-round-list">
      {withdrawals.map((item) => <article className="round-option" key={item.id}>
        <div><strong>{money(item.amountCents)}</strong> · {labels[item.status]}</div>
        <p>Solicitado em {dateTime(item.createdAt)}</p>
        {item.status === "PAID" && <p>Pago e baixado em {dateTime(item.updatedAt)}{item.providerRef ? " · Referência: " + item.providerRef : ""}</p>}
        {item.statusHistory.map((event, index) => <p key={item.id + event.createdAt + index}><small>{dateTime(event.createdAt)} · {event.note ?? labels[event.toStatus as Withdrawal["status"]]}</small></p>)}
      </article>)}
    </div>}
    <button type="button" className="secondary-button" disabled={loading || busy} onClick={() => void load()}>Atualizar carteira</button>
  </section>;
}
