"use client";

import { useCallback, useEffect, useState } from "react";

type Cashier = {
  id: string;
  username: string;
  fullName: string | null;
  whatsapp: string | null;
  commissionRateBasisPoints: number;
  commissionPercent: number;
  status: "ACTIVE" | "BLOCKED" | "PENDING";
  mustChangePassword: boolean;
  createdAt: string;
};

type FormState = {
  fullName: string;
  username: string;
  password: string;
  whatsapp: string;
  commissionPercent: string;
  status: "ACTIVE" | "BLOCKED";
};

const emptyForm: FormState = {
  fullName: "", username: "", password: "", whatsapp: "", commissionPercent: "20", status: "ACTIVE",
};

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function AdminCashierManager() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/cashiers", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar os cambistas.");
      setCashiers(body.cashiers as Cashier[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar os cambistas.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function beginEdit(cashier: Cashier) {
    setEditingId(cashier.id);
    setForm({
      fullName: cashier.fullName ?? "",
      username: cashier.username,
      password: "",
      whatsapp: cashier.whatsapp ?? "",
      commissionPercent: String(cashier.commissionPercent),
      status: cashier.status === "BLOCKED" ? "BLOCKED" : "ACTIVE",
    });
    setError(""); setNotice("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const commissionPercent = Number(form.commissionPercent);
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
      setError("A comissão precisa estar entre 0% e 100%."); return;
    }
    if (!editingId && form.password.length < 6) {
      setError("A senha inicial precisa ter pelo menos 6 caracteres."); return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName, username: form.username, whatsapp: form.whatsapp,
        commissionPercent, status: form.status,
      };
      if (!editingId || form.password) payload.password = form.password;
      const response = await fetch(editingId ? "/api/admin/cashiers/" + encodeURIComponent(editingId) : "/api/admin/cashiers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar o cambista.");
      setNotice(editingId ? "Cadastro do cambista atualizado." : "Cambista cadastrado. Ele deverá trocar a senha no primeiro acesso.");
      resetForm();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao salvar o cambista.");
    } finally { setBusy(false); }
  }

  return <section className="feature-card" aria-labelledby="admin-cashiers-heading">
    <span className="feature-label">Equipe de vendas</span>
    <h2 id="admin-cashiers-heading">Cadastro de cambistas</h2>
    <p>Cadastre cada vendedor com sua própria comissão. Alterar a porcentagem não deve mudar as comissões já registradas em vendas anteriores.</p>
    <form className="admin-round-create" onSubmit={submit}>
      <h3>{editingId ? "Editar cambista" : "Cadastrar novo cambista"}</h3>
      <label>Nome completo
        <input autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} minLength={3} maxLength={120} required />
      </label>
      <label>Nome de usuário
        <input autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]+" required />
      </label>
      <label>{editingId ? "Nova senha (opcional)" : "Senha inicial"}
        <input autoComplete="new-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={editingId && !form.password ? undefined : 6} maxLength={1024} required={!editingId} placeholder={editingId ? "Deixe vazio para manter a senha" : "Mínimo de 12 caracteres"} />
      </label>
      <label>WhatsApp
        <input autoComplete="tel" type="tel" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} minLength={10} maxLength={24} required />
      </label>
      <label>Comissão individual (%)
        <input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={form.commissionPercent} onChange={(event) => setForm({ ...form, commissionPercent: event.target.value })} required />
      </label>
      {editingId && <label>Status da conta
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}>
          <option value="ACTIVE">Ativa</option>
          <option value="BLOCKED">Bloqueada</option>
        </select>
      </label>}
      <div className="round-actions">
        <button type="submit" disabled={busy}>{busy ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar cambista"}</button>
        {editingId && <button type="button" className="secondary-button" disabled={busy} onClick={resetForm}>Cancelar edição</button>}
      </div>
    </form>
    {error && <p role="alert" className="note-inline">{error}</p>}
    {notice && <p role="status" className="note-inline">{notice}</p>}
    <h3>Cambistas cadastrados</h3>
    {loading ? <p>Carregando cambistas…</p> : cashiers.length === 0 ? <p>Nenhum cambista cadastrado.</p> : <div className="admin-round-list">
      {cashiers.map((cashier) => <article className="round-option" key={cashier.id}>
        <div>
          <strong>{cashier.fullName || cashier.username}</strong>
          <p>Usuário: {cashier.username} · WhatsApp: {cashier.whatsapp || "Não informado"}</p>
          <p>Comissão individual: <strong>{cashier.commissionPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</strong> · Status: {cashier.status === "ACTIVE" ? "Ativo" : cashier.status === "BLOCKED" ? "Bloqueado" : "Pendente"}</p>
          <p>Cadastro: {new Date(cashier.createdAt).toLocaleDateString("pt-BR")}{cashier.mustChangePassword ? " · Troca de senha no primeiro acesso" : ""}</p>
        </div>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => beginEdit(cashier)}>Editar cadastro</button>
      </article>)}
    </div>}
  </section>;
}
