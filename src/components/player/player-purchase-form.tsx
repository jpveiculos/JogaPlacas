"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlateVisual } from "@/components/plates/plate-visual";
import { PlayerPurchaseReceipt } from "@/components/receipts/player-purchase-receipt";

type AvailableRound = {
  id: string; code: string; startsAt: string; cutoffAt: string; resultAt: string; status: "SCHEDULED" | "OPEN";
};
type CreatedPurchase = {
  id: string; receiptCode: string | null; status: string; totalCents: number; currency: string;
  participations: Array<{ roundId: string; totalCents: number; lines: Array<{ plateDisplay: string; totalCents: number; allocationCents: Record<string, number> }> }>;
};
type PlateFormat = "LEGACY" | "MERCOSUR";
type PlayerPaymentMethod = "PIX" | "WALLET";

function sanitizePlateInput(value: string, format: PlateFormat): string {
  const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, "").split("");
  let result = "";
  for (const char of chars) {
    const index = result.length;
    const expectsLetter = format === "LEGACY" ? index < 3 : index < 3 || index === 4;
    if (expectsLetter ? /[A-Z]/.test(char) : /[0-9]/.test(char)) result += char;
    if (result.length >= 7) break;
  }
  return result;
}

type PixCheckout = { copyPaste: string | null; qrCodeBase64: string | null; ticketUrl: string | null };

function formatDate(value: string) {
  const date = new Date(value);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
  const timeLabel = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(date);
  return `${dateLabel} ${timeLabel}`;
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
  const [legacyPlate, setLegacyPlate] = useState("");
  const [mercosurPlate, setMercosurPlate] = useState("");
  const [addedPlates, setAddedPlates] = useState<string[]>([]);
  const legacyInputRef = useRef<HTMLInputElement>(null);
  const mercosurInputRef = useRef<HTMLInputElement>(null);
  const [stake, setStake] = useState("1,00");
  const [paymentMethod, setPaymentMethod] = useState<PlayerPaymentMethod>("PIX");
  const [walletBalanceCents, setWalletBalanceCents] = useState<number | null>(null);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [purchase, setPurchase] = useState<CreatedPurchase | null>(null);
  const [pixCheckout, setPixCheckout] = useState<PixCheckout | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [receiptPurchaseId, setReceiptPurchaseId] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/player/withdrawals", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar o saldo.");
        return body.availableCents as number;
      })
      .then((balance) => { if (active) setWalletBalanceCents(balance); })
      .catch(() => { if (active) setWalletBalanceCents(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    const refreshRounds = async (showLoading = false) => {
      if (refreshing) return;
      refreshing = true;
      if (showLoading) setLoadingRounds(true);
      try {
        const response = await fetch("/api/player/rounds", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar as rodadas.");
        const items = body.rounds as AvailableRound[];
        if (!active) return;
        setRounds(items);
        setSelectedRounds((current) => {
          const availableIds = new Set(items.map((round) => round.id));
          const next = current.filter((id) => availableIds.has(id));
          return next.length === current.length ? current : next;
        });
        setError("");
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Erro ao atualizar as rodadas.");
      } finally {
        refreshing = false;
        if (active) setLoadingRounds(false);
      }
    };
    void refreshRounds(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRounds();
    }, 15000);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void refreshRounds();
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, []);

  useEffect(() => {
    if (!pixModalOpen || !purchase?.id) return;
    let active = true;
    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/player/purchases/${encodeURIComponent(purchase.id)}/status`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as {
          receiptReady?: boolean;
          paymentStatus?: string;
          purchaseStatus?: string;
          providerStatus?: string | null;
        };
        if (!active) return;
        if (body.receiptReady) {
          setReceiptPurchaseId(purchase.id);
          setPixModalOpen(false);
          setPurchase(null);
          setPixCheckout(null);
          setNotice("Pagamento confirmado. Seu recibo oficial está na tela.");
          return;
        }
        if (["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(body.paymentStatus ?? "")
          || ["CANCELLED", "REFUNDED"].includes(body.purchaseStatus ?? "")) {
          setPixModalOpen(false);
          setPurchase(null);
          setPixCheckout(null);
          setLegacyPlate(""); setMercosurPlate(""); setAddedPlates([]);
          setSelectedRounds([]);
          setStake("1,00");
          setNotice("O pagamento Pix não foi aprovado ou foi encerrado. Nenhum recibo foi emitido. Você já pode iniciar outro jogo.");
        }
      } catch {
        // Polling is best-effort; a temporary network issue must not change payment state.
      }
    };
    void checkPayment();
    const timer = window.setInterval(() => { void checkPayment(); }, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [pixModalOpen, purchase?.id]);

  const stakeCents = useMemo(() => parseStake(stake), [stake]);
  const normalizedLegacyPlate = legacyPlate.trim().toUpperCase();
  const normalizedMercosurPlate = mercosurPlate.trim().toUpperCase().replace(/-/g, "");
  const legacyPlateValid = /^[A-Z]{3}-?\d{4}$/.test(normalizedLegacyPlate);
  const mercosurPlateValid = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(normalizedMercosurPlate);
  const plateCount = (legacyPlateValid ? 1 : 0) + (mercosurPlateValid ? 1 : 0);
  const currentPlateDisplays = [
    ...(legacyPlateValid ? [normalizedLegacyPlate.replace(/-/g, "")] : []),
    ...(mercosurPlateValid ? [normalizedMercosurPlate] : []),
  ];
  const plateLines = [
    ...addedPlates.map((plateDisplay) => ({ plateDisplay, stakeCents: stakeCents ?? 0 })),
    ...currentPlateDisplays.filter((plateDisplay) => !addedPlates.includes(plateDisplay)).map((plateDisplay) => ({ plateDisplay, stakeCents: stakeCents ?? 0 })),
  ];
  const totalEstimate = stakeCents !== null ? stakeCents * selectedRounds.length * plateLines.length : 0;
  const walletHasEnough = walletBalanceCents !== null && totalEstimate > 0 && walletBalanceCents >= totalEstimate;
  function addCurrentPlates() {
    if (!currentPlateDisplays.length) { setError("Preencha uma placa válida antes de adicionar."); return; }
    setError(""); setNotice("");
    setAddedPlates((current) => [...current, ...currentPlateDisplays.filter((plate) => !current.includes(plate))]);
    setLegacyPlate(""); setMercosurPlate("");
  }
  function removeAddedPlate(plate: string) {
    setAddedPlates((current) => current.filter((item) => item !== plate));
  }

  function toggleRound(id: string) {
    const index = rounds.findIndex((round) => round.id === id);
    if (index < 0) return;
    setSelectedRounds((current) => {
      const selectedIndex = current.indexOf(id);
      if (selectedIndex >= 0) {
        // Removing one round also removes every later repetition so the sequence stays contiguous.
        return current.slice(0, selectedIndex);
      }
      if (current.length >= 10 || index !== current.length) return current;
      const round = rounds[index]!;
      if (current.length === 0 && round.status !== "OPEN") return current;
      if (current.length > 0) {
        const previous = rounds.find((item) => item.id === current[current.length - 1]);
        if (!previous || new Date(round.resultAt).getTime() - new Date(previous.resultAt).getTime() !== 30 * 60_000) {
          return current;
        }
      }
      return [...current, id];
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setPurchase(null); setPixCheckout(null);
    if (!plateLines.length) {
      setError("Digite uma placa válida em pelo menos uma das placas.");
      return;
    }
    if (stakeCents === null) { setError("O valor mínimo por placa e rodada é R$ 1,00. Use até duas casas decimais."); return; }
    if (!selectedRounds.length) { setError("Selecione pelo menos uma rodada."); return; }
    if (paymentMethod === "WALLET" && !walletHasEnough) {
      setError(walletBalanceCents === null
        ? "Não foi possível confirmar seu saldo agora. Atualize a carteira ou escolha Pix."
        : `Saldo insuficiente. Seu saldo é ${formatMoney(walletBalanceCents)} e esta aposta custa ${formatMoney(totalEstimate)}. Escolha Pix ou adicione saldo.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/player/purchases", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current ?? (idempotencyKey.current = crypto.randomUUID()),
          roundIds: selectedRounds, lines: plateLines, paymentMethod,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível registrar a compra.");
      setPurchase(body.purchase as CreatedPurchase);
      setPixCheckout((body.pixCheckout as PixCheckout | null) ?? null);
      if (body.receiptReady) {
        setReceiptPurchaseId(body.purchase.id);
        setPixModalOpen(false);
        setLegacyPlate(""); setMercosurPlate(""); setAddedPlates([]); setSelectedRounds([]); setStake("1,00");
        setPaymentMethod("PIX");
        setNotice(body.message ?? "Pagamento confirmado e recibo emitido.");
        setPurchase(null);
        void fetch("/api/player/withdrawals", { cache: "no-store" })
          .then((response) => response.json())
          .then((wallet) => { if (typeof wallet.availableCents === "number") setWalletBalanceCents(wallet.availableCents); })
          .catch(() => undefined);
      } else {
        setPixModalOpen(true);
      }
      idempotencyKey.current = null;
      setNotice(body.message ?? "Compra registrada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao registrar a compra.");
    } finally { setSubmitting(false); }
  }

  return (
    <section className="feature-card" aria-label="Nova aposta">
      <span className="feature-label">Nova aposta</span>
      <form onSubmit={submit} className="purchase-form">
        <div className="plate-pair" aria-label="Escolha uma ou as duas placas para apostar">
          <div className="plate-entry plate-entry-card">
            <button type="button" className="plate-tap-target" aria-label="Digitar placa cinza antiga" onClick={() => legacyInputRef.current?.focus()}>
              <PlateVisual format="LEGACY" value={legacyPlate.toUpperCase().replace(/-/g, "")} placeholder="ABC1234" />
            </button>
            <input ref={legacyInputRef} className="plate-number-overlay-input" aria-label="Número da placa cinza antiga" value={legacyPlate} onChange={(event) => setLegacyPlate(sanitizePlateInput(event.target.value, "LEGACY"))} inputMode="text" placeholder="ABC1234" maxLength={7} autoComplete="off" />
          </div>
          <div className="plate-entry plate-entry-card">
            <button type="button" className="plate-tap-target" aria-label="Digitar placa Mercosul" onClick={() => mercosurInputRef.current?.focus()}>
              <PlateVisual format="MERCOSUR" value={mercosurPlate.toUpperCase().replace(/-/g, "")} placeholder="ABC1D23" />
            </button>
            <input ref={mercosurInputRef} className="plate-number-overlay-input" aria-label="Número da placa Mercosul" value={mercosurPlate} onChange={(event) => setMercosurPlate(sanitizePlateInput(event.target.value, "MERCOSUR"))} inputMode="text" placeholder="ABC1D23" maxLength={7} autoComplete="off" />
          </div>
        </div>
        <div className="plate-add-actions">
          <button type="button" className="secondary-action" onClick={addCurrentPlates}>Adicionar mais placas</button>
          {addedPlates.length > 0 && <div className="added-plates" aria-live="polite">
            <strong>Placas adicionadas ({addedPlates.length})</strong>
            {addedPlates.map((plate, index) => <div className="added-plate-row" key={plate + "-" + index}><span>{plate}</span><button type="button" className="remove-plate-button" onClick={() => removeAddedPlate(plate)} aria-label={`Remover placa ${plate}`}>Remover</button></div>)}
          </div>}
        </div>
        <label>Valor total por placa e rodada (R$)
          <input inputMode="decimal" value={stake} onChange={(event) => setStake(event.target.value)} placeholder="1,00" required />
        </label>
        <fieldset className="plate-format-options">
          <legend>Forma de pagamento</legend>
          <label className={paymentMethod === "PIX" ? "format-choice selected" : "format-choice"}>
            <input type="radio" name="player-payment-method" value="PIX" checked={paymentMethod === "PIX"} onChange={() => setPaymentMethod("PIX")} />
            <span><strong>Pix</strong></span>
          </label>
          <label className={paymentMethod === "WALLET" ? "format-choice selected" : "format-choice"}>
            <input type="radio" name="player-payment-method" value="WALLET" checked={paymentMethod === "WALLET"} onChange={() => setPaymentMethod("WALLET")} />
            <span><strong>Saldo da conta</strong></span>
          </label>
          <p className="player-wallet-balance payment-wallet-balance">Seu saldo disponível: <strong>{walletBalanceCents === null ? "consultando…" : formatMoney(walletBalanceCents)}</strong></p>
          {paymentMethod === "WALLET" && !walletHasEnough && <p role="alert" className="note-inline">{walletBalanceCents === null ? "Não foi possível consultar o saldo. Atualize a carteira ou escolha Pix." : `Saldo insuficiente: você tem ${formatMoney(walletBalanceCents)} e precisa de ${formatMoney(totalEstimate)}. Escolha Pix para continuar ou adicione saldo.`}</p>}
        </fieldset>
        <fieldset>
          <legend>Rodadas</legend>
          {loadingRounds ? <p>Carregando rodadas…</p> : rounds.length === 0 ? <p>Não há rodadas disponíveis para compra no momento.</p> : (
            <div className="round-options round-carousel">{rounds.slice(0, 10).map((round, index) => (
              <label key={round.id} className="round-option">
                <input type="checkbox" checked={selectedRounds.includes(round.id)} disabled={index > selectedRounds.length || (index === 0 && round.status !== "OPEN") || (index === selectedRounds.length && selectedRounds.length > 0 && new Date(round.resultAt).getTime() - new Date(rounds[index - 1]!.resultAt).getTime() !== 30 * 60_000)} onChange={() => toggleRound(round.id)} />
                <span><strong>{round.code}</strong><br />Início: {formatDate(round.startsAt)}<br />Encerra: {formatDate(round.cutoffAt)}</span>
              </label>
            ))}</div>
          )}
          {selectedRounds.length === 10 && <small>Limite de 10 rodadas por compra atingido.</small>}
        </fieldset>
        {stakeCents !== null && selectedRounds.length > 0 && <p>Total estimado: <strong>{formatMoney(stakeCents * selectedRounds.length * plateLines.length)}</strong> ({plateLines.length} placa(s), {selectedRounds.length} rodada(s)).</p>}
        <button type="submit" disabled={submitting || loadingRounds || rounds.length === 0}>{submitting ? "Registrando…" : paymentMethod === "WALLET" ? "Pagar com saldo da conta" : "Continuar para Pix"}</button>
      </form>
      {error && <p role="alert" className="note-inline">{error}</p>}
      {notice && <p role="status" className="note-inline">{notice}</p>}
      {purchase && pixModalOpen && (
        <div className="modal-backdrop" role="presentation">
        <section className="modal-panel pix-modal" role="dialog" aria-modal="true" aria-labelledby="pix-modal-heading">
          <img className="pix-brand-logo" src="/images/brand/joga-placa-logo.jpg" alt="Joga Placa" /><h3 id="pix-modal-heading">Pagamento Pix</h3><p>Status: aguardando confirmação do pagamento</p><p>Total: <strong>{formatMoney(purchase.totalCents)}</strong></p>
          {purchase.participations.flatMap((participation) => participation.lines.map((line, index) => (
            <div key={participation.roundId + line.plateDisplay + index} className="receipt-plate-line">
              <PlateVisual format={/^[A-Z]{3}-?\d{4}$/.test(line.plateDisplay) ? "LEGACY" : "MERCOSUR"} value={line.plateDisplay} />
              <p>{line.plateDisplay} — {formatMoney(line.totalCents)}</p>
              <small>Unidade: {formatMoney(line.allocationCents.unit)} · Dezena: {formatMoney(line.allocationCents.tens)} · Centena: {formatMoney(line.allocationCents.hundreds)} · Milhar: {formatMoney(line.allocationCents.thousands)} · Letras: {formatMoney(line.allocationCents.letters)} · Placa completa: {formatMoney(line.allocationCents.fullPlate)}</small>
            </div>
          )))}
          {pixCheckout?.qrCodeBase64 && <div className="pix-checkout">
            <h4>Escaneie o QR Code Pix</h4>
            <img src={"data:image/png;base64," + pixCheckout.qrCodeBase64} alt="QR Code para pagar a compra via Pix" width={240} height={240} />
          </div>}
          {pixCheckout?.copyPaste && <div className="pix-copy-paste">
            <label htmlFor="pix-copy-paste">Pix copia e cola</label>
            <textarea id="pix-copy-paste" readOnly value={pixCheckout.copyPaste} rows={4} onFocus={(event) => event.currentTarget.select()} />
            <button type="button" onClick={() => {
              if (pixCheckout.copyPaste && navigator.clipboard) {
                void navigator.clipboard.writeText(pixCheckout.copyPaste).then(() => setNotice("Código Pix copiado."));
              }
            }}>Copiar código Pix</button>
          </div>}
          {!pixCheckout?.copyPaste && <p role="status">A cobrança ainda não está disponível. A compra permanece pendente; fechar esta janela não cancela nem confirma o pagamento.</p>}
          <p>O recibo oficial só será exibido após a confirmação autêntica do pagamento.</p>
          <button type="button" onClick={() => {
            setPixModalOpen(false);
            setReceiptPurchaseId(null);
            setPurchase(null);
            setPixCheckout(null);
            setLegacyPlate(""); setMercosurPlate("");
            setSelectedRounds([]);
            setStake("1,00");
            setNotice("Tela liberada para iniciar outro jogo. A cobrança anterior continua pendente até confirmação ou reconciliação.");
            fetch("/api/player/rounds", { cache: "no-store" }).then((response) => response.json()).then((body) => setRounds(body.rounds ?? [])).catch(() => undefined);
          }}>Sair e iniciar outro jogo</button>
        </section>
        </div>
      )}
      {receiptPurchaseId && <PlayerPurchaseReceipt purchaseId={receiptPurchaseId} autoOpen onClose={() => setReceiptPurchaseId(null)} />}
    </section>
  );
}
