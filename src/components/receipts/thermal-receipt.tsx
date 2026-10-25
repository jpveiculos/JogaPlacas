"use client";

import type { CSSProperties } from "react";

export type ThermalReceiptPlate = {
  plateDisplay: string;
  plateFormat: "LEGACY" | "MERCOSUR";
  roundCode: string;
  stakeCents: number;
};

export type ThermalReceiptProps = {
  receiptCode: string;
  paymentStatus: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "REFUNDED";
  issuedAt: string;
  totalCents: number;
  plates: ThermalReceiptPlate[];
  customerLabel?: string | null;
  paymentLabel?: string;
  qrCodeDataUrl?: string | null;
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
}: ThermalReceiptProps) {
  if (paymentStatus !== "CONFIRMED" || !/^JP-[A-Z0-9]{8,32}$/.test(receiptCode)) return null;

  const money = (cents: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(issuedAt));

  const qrStyle: CSSProperties = { width: 76, height: 76, objectFit: "contain" };

  return (
    <div className="thermal-receipt-print-root">
      <article className="thermal-receipt" aria-label={`Recibo ${receiptCode}`}>
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
              <span>{plate.plateFormat === "LEGACY" ? "Placa cinza" : "Placa Mercosul"} · Rodada {plate.roundCode}</span>
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
      <button className="thermal-receipt-print-button" type="button" onClick={() => window.print()}>
        Imprimir recibo (58 mm)
      </button>
    </div>
  );
}
