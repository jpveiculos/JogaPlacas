"use client";

import type { CSSProperties } from "react";

import type { ThermalReceiptPlate } from "./thermal-receipt-types";
import { getReceiptRepetitionNumbers } from "./receipt-repetition";
export { getReceiptRepetitionNumbers } from "./receipt-repetition";


export type ThermalReceiptProps = {
  receiptCode: string;
  paymentStatus: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "REFUNDED";
  issuedAt: string;
  totalCents: number;
  plates: ThermalReceiptPlate[];
  customerLabel?: string | null;
  paymentLabel?: string;
  qrCodeDataUrl?: string | null;
  onClose?: () => void;
};

/**
 * Print-ready 58 mm thermal receipt.
 * Only accepts a confirmed payment so pending purchases cannot be presented
 * as an official receipt. QR generation is supplied by the trusted app layer.
 */
export function ThermalReceipt({
  receiptCode,
  paymentStatus,
  issuedAt,
  totalCents,
  plates,
  customerLabel,
  paymentLabel = "Pagamento confirmado",
  qrCodeDataUrl,
  onClose,
}: ThermalReceiptProps) {
  if (paymentStatus !== "CONFIRMED" || !/^JP-[A-Z0-9]{8,32}$/.test(receiptCode)) return null;

  const money = (cents: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
  const issuedDate = new Date(issuedAt);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(issuedDate);
  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).format(issuedDate);
  const date = `${dateLabel} ${timeLabel}`;

  const qrStyle: CSSProperties = { width: 76, height: 76, objectFit: "contain" };
  const repetitionNumbers = getReceiptRepetitionNumbers(plates);

  function downloadReceipt() {
    const article = document.getElementById("thermal-receipt-" + receiptCode);
    if (!article) return;
    const styles = " @page{size:58mm auto;margin:2mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}.thermal-receipt{width:48mm;max-width:100%;margin:0 auto;padding:2mm 0;font-size:10px;line-height:1.35;overflow-wrap:anywhere}.thermal-receipt-header{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center}.thermal-receipt-brand{font-size:16px;letter-spacing:.04em}.thermal-receipt-code-row{display:grid;grid-template-columns:minmax(0,1fr) 20mm;align-items:center;gap:1.5mm;margin:3mm 0}.thermal-receipt-code-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.thermal-receipt-label,.thermal-receipt-section-title{font-size:8px;font-weight:700}.thermal-receipt-code{font-size:11px;line-height:1.2;word-break:break-all}.thermal-receipt-payment{font-size:8px}.thermal-receipt-qr,.thermal-receipt-qr-placeholder{width:20mm;height:20mm;object-fit:contain}.thermal-receipt-qr-placeholder{display:grid;place-items:center;border:1px dashed #777}.thermal-receipt-divider{border-top:1px dashed #222;margin:2.5mm 0}.thermal-receipt-items{display:flex;flex-direction:column;gap:2.5mm}.thermal-receipt-item{display:flex;flex-direction:column;gap:1px}.thermal-receipt-item-heading,.thermal-receipt-total{display:flex;justify-content:space-between;gap:2mm}.thermal-receipt-total{font-size:12px}.thermal-receipt-footer{display:flex;flex-direction:column;align-items:center;gap:2px;margin-top:4mm;text-align:center;font-size:8px}.thermal-receipt-footer-code{margin-top:1mm;font-weight:700}.thermal-receipt-customer{margin:2mm 0}";
    const html = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Recibo " + receiptCode + "</title><style>" + styles + "</style></head><body>" + article.outerHTML + "</body></html>";
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "recibo-" + receiptCode + ".html";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    onClose?.();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="thermal-receipt-print-root">
      <article id={`thermal-receipt-${receiptCode}`} className="thermal-receipt" aria-label={`Recibo ${receiptCode}`}>
        <header className="thermal-receipt-header">
          <strong className="thermal-receipt-brand">JOGA PLACAS</strong>
          <span>COMPROVANTE DE APOSTA</span>
          <span>{date}</span>
        </header>

        <section className="thermal-receipt-code-row" aria-label="Código e QR Code do recibo">
          <div className="thermal-receipt-code-copy">
            <span className="thermal-receipt-label">CÓDIGO DO RECIBO</span>
            <strong className="thermal-receipt-code">{receiptCode}</strong>
            <span className="thermal-receipt-payment">{paymentLabel}</span>
          </div>
          {qrCodeDataUrl ? (
            <img className="thermal-receipt-qr" style={qrStyle} src={qrCodeDataUrl} alt={`QR Code do recibo ${receiptCode}`} />
          ) : (
            <div className="thermal-receipt-qr-placeholder" aria-label="QR Code será exibido após integração">
              QR
            </div>
          )}
        </section>

        {customerLabel && <p className="thermal-receipt-customer"><span>Cliente:</span> {customerLabel}</p>}

        <div className="thermal-receipt-divider" />
        <section className="thermal-receipt-items">
          <strong className="thermal-receipt-section-title">APOSTAS</strong>
          {plates.map((plate, index) => (
            <div className="thermal-receipt-item" key={`${plate.roundCode}-${plate.plateFormat}-${plate.plateDisplay}-${index}`}>
              <div className="thermal-receipt-item-heading">
                <strong>{plate.plateDisplay}</strong>
                <strong>{money(plate.stakeCents)}</strong>
              </div>
              <span>Repetição {repetitionNumbers[index]} · {plate.plateFormat === "LEGACY" ? "Placa cinza" : "Placa Mercosul"}</span>
              <span>Rodada {plate.roundCode}</span>
            </div>
          ))}
        </section>

        <div className="thermal-receipt-divider" />
        <div className="thermal-receipt-total">
          <span>TOTAL PAGO</span>
          <strong>{money(totalCents)}</strong>
        </div>
        <footer className="thermal-receipt-footer">
          <strong>GUARDE ESTE COMPROVANTE</strong>
          <span>Consulte o resultado pelo código do recibo.</span>
          <span>Este recibo confirma somente o pagamento e as apostas listadas.</span>
          <span className="thermal-receipt-footer-code">{receiptCode}</span>
        </footer>
      </article>
      <div className="thermal-receipt-actions" aria-label="Ações do recibo">
        <button className="thermal-receipt-print-button" type="button" onClick={() => window.print()}>Imprimir recibo</button>
        <button className="thermal-receipt-download-button" type="button" onClick={downloadReceipt}>Baixar recibo</button>
        {onClose && <button className="thermal-receipt-exit-button" type="button" onClick={onClose}>Sair / Fechar recibo</button>}
      </div>
    </div>
  );
}
