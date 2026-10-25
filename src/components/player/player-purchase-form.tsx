"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlateVisual } from "@/components/plates/plate-visual";

type AvailableRound = {
  id: string; code: string; startsAt: string; cutoffAt: string; resultAt: string; status: "SCHEDULED" | "OPEN";
};
type CreatedPurchase = {
  id: string; receiptCode: string | null; status: string; totalCents: number; currency: string;
  participations: Array<{ roundId: string; totalCents: number; lines: Array<{ plateDisplay: string; totalCents: number; allocationCents: Record<string, number> }> }>;
};
type PlateFormat = "LEGACY" | "MERCOSUR";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
function parseStake(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(cents) && cents >= 100 && cents <= 2_000_000_000 ? cents : null;
}

export function PlayerPurchaseForm() {
  const [rounds, setRounds] = useState<AvailableRound[]>([]);
  const [selectedRounds, setSelectedRounds] = useState<string[]>([]);
  const [plateFormat, setPlateFormat] = useState<PlateFormat>("LEGACY");
  const [plate, setPlate] = useState("");
  const [stake, setStake] = useState("1,00");
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [purchase, setPurchase] = useState<CreatedPurchase | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/player/rounds", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar as rodadas.");
        return body.rounds as AvailableRound[];
      })
      .then((items) => { if (active) setRounds(items); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar rodadas."); })
      .finally(() => { if (active) setLoadingRounds(false); });
    return () => { active = false; };
  }, []);

  const stakeCents = useMemo(() => parseStake(stake), [stake]);
  const normalizedPlate = plate.trim().toUpperCase();
  const plateLooksValid = plateFormat === "LEGACY"
    ? /^[A-Z]{3}-?\d{4}$/.test(normalizedPlate)
    : /^[A-Z]{3}\d[A-Z]\d{2}$/.test(normalizedPlate);
  const platePreview = plateFormat === "LEGACY"
    ? normalizedPlate.replace(/^(\w{3})(\d{4})$/, "$1-$2")
    : normalizedPlate.replace("-", "");

  function toggleRound(id: string) {
    setSelectedRounds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length < 10 ? [...current, id] : current);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setPurchase(null);
    if (!plateLooksValid) {
      setError(plateFormat === "LEGACY"
        ? "Placa cinza inválida. Use o formato ABC-1234."
        : "Placa Mercosul inválida. Use o formato ABC1D23 (a quinta posição aceita letras A–Z).");
      return;
    }
    if (stakeCents === null) { setError("O valor mínimo por placa e rodada é R$ 1,00. Use até duas casas decimais."); return; }
    if (!selectedRounds.length) { setError("Selecione pelo menos uma rodada."); return; }

    setSubmitting(true);
    try {
      const response = await fetch("/api/player/purchases", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current ?? (idempotencyKey.current = crypto.randomUUID()),
          roundIds: selectedRounds, lines: [{ plateDisplay: platePreview, stakeCents }],
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível registrar a compra.");
      setPurchase(body.purchase as CreatedPurchase);
      idempotencyKey.current = null;
      setNotice(body.message ?? "Compra registrada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao registrar a compra.");
    } finally { setSubmitting(false); }
  }

  return (
    <section className="feature-card" aria-labelledby="player-purchase-heading">
      <span className="feature-label">Nova aposta</span>
      <h2 id="player-purchase-heading">Escolha o modelo da placa e a rodada</h2>
      <p>Você pode jogar nos dois formatos. Cada aposta concorre somente ao resultado do mesmo formato. O valor é dividido automaticamente entre seis categorias. A compra ficará pendente; o Pix ainda não está conectado.</p>
      <form onSubmit={submit} className="purchase-form">
        <fieldset className="plate-format-options">
          <legend>Formato da placa</legend>
          <label className={plateFormat === "LEGACY" ? "format-choice selected" : "format-choice"}>
            <input type="radio" name="plateFormat" value="LEGACY" checked={plateFormat === "LEGACY"} onChange={() => { setPlateFormat("LEGACY"); setPlate(""); }} />
            <span><strong>Placa cinza (antiga)</strong><br /><small>ABC-1234</small></span>
          </label>
          <label className={plateFormat === "MERCOSUR" ? "format-choice selected" : "format-choice"}>
            <input type="radio" name="plateFormat" value="MERCOSUR" checked={plateFormat === "MERCOSUR"} onChange={() => { setPlateFormat("MERCOSUR"); setPlate(""); }} />
            <span><strong>Placa Mercosul (nova)</strong><br /><small>ABC1D23</small></span>
          </label>
        </fieldset>
        <div className="plate-entry">
          <label htmlFor="player-plate-input">Digite sua placa</label>
          <PlateVisual format={plateFormat} value={platePreview} placeholder={plateFormat === "LEGACY" ? "ABC-1234" : "ABC1D23"} />
          <input id="player-plate-input" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} placeholder={plateFormat === "LEGACY" ? "ABC-1234" : "ABC1D23"} maxLength={8} autoComplete="off" aria-describedby="plate-format-help" required />
          <small id="plate-format-help">{plateFormat === "LEGACY" ? "Três letras, hífen e quatro números." : "Três letras, um número, uma letra e dois números. A quinta posição aceita A–Z."}</small>
        </div>
        <label>Valor total por placa e rodada (R$)
          <input inputMode="decimal" value={stake} onChange={(event) => setStake(event.target.value)} placeholder="1,00" required />
        </label>
        <fieldset>
          <legend>Rodadas disponíveis (até 10)</legend>
          {loadingRounds ? <p>Carregando rodadas…</p> : rounds.length === 0 ? <p>Não há rodadas disponíveis para compra no momento.</p> : (
            <div className="round-options">{rounds.map((round) => (
              <label key={round.id} className="round-option">
                <input type="checkbox" checked={selectedRounds.includes(round.id)} onChange={() => toggleRound(round.id)} />
                <span><strong>{round.code}</strong><br />Início: {formatDate(round.startsAt)}<br />Encerramento: {formatDate(round.cutoffAt)}</span>
              </label>
            ))}</div>
          )}
          {selectedRounds.length === 10 && <small>Limite de 10 rodadas por compra atingido.</small>}
        </fieldset>
        {stakeCents !== null && selectedRounds.length > 0 && <p>Total estimado: <strong>{formatMoney(stakeCents * selectedRounds.length)}</strong> ({selectedRounds.length} rodada(s)).</p>}
        <button type="submit" disabled={submitting || loadingRounds || rounds.length === 0}>{submitting ? "Registrando…" : "Registrar compra pendente"}</button>
      </form>
      {error && <p role="alert" className="note-inline">{error}</p>}
      {notice && <p role="status" className="note-inline">{notice}</p>}
      {purchase && (
        <div className="purchase-confirmation">
          <h3>Compra registrada</h3><p>Status: aguardando confirmação do pagamento</p><p>Total: <strong>{formatMoney(purchase.totalCents)}</strong></p>
          {purchase.participations.flatMap((participation) => participation.lines.map((line, index) => (
            <div key={participation.roundId + line.plateDisplay + index} className="receipt-plate-line">
              <PlateVisual format={/^[A-Z]{3}-?\d{4}$/.test(line.plateDisplay) ? "LEGACY" : "MERCOSUR"} value={line.plateDisplay} />
              <p>{line.plateDisplay} — {formatMoney(line.totalCents)}</p>
              <small>Unidade: {formatMoney(line.allocationCents.unit)} · Dezena: {formatMoney(line.allocationCents.tens)} · Centena: {formatMoney(line.allocationCents.hundreds)} · Milhar: {formatMoney(line.allocationCents.thousands)} · Letras: {formatMoney(line.allocationCents.letters)} · Placa completa: {formatMoney(line.allocationCents.fullPlate)}</small>
            </div>
          )))}
          <p>O recibo será gerado somente depois que o pagamento for confirmado. Esta compra ainda não está finalizada; não há QR Code nem cobrança Pix nesta etapa.</p>
        </div>
      )}
    </section>
  );
}
