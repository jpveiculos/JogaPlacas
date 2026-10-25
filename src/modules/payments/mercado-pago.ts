import { createHash } from "node:crypto";

const API_BASE = "https://api.mercadopago.com";

type MercadoPagoOrder = {
  id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string | number;
  external_reference?: string;
  transactions?: {
    payments?: Array<{
      amount?: string | number;
      status?: string;
      status_detail?: string;
      payment_method?: {
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    }>;
  };
};

export type PixCheckout = {
  orderId: string;
  status: string;
  statusDetail: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
};

/**
 * The player is not asked for or required to provide an email.
 * Mercado Pago's Orders API requires payer.email, so mirror the legacy
 * operational fallback with a deterministic synthetic address. It is not
 * used for contact and must never be presented as the player's real email.
 */
export function syntheticPayerEmail(playerId: string): string {
  const digest = createHash("sha256").update(playerId).digest("hex").slice(0, 20);
  const domain = (process.env.MERCADOPAGO_PAYER_EMAIL_DOMAIN || "jogaplaca.com.br")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    throw new Error("MERCADOPAGO_PAYER_EMAIL_DOMAIN is invalid");
  }
  return `jogador-${digest}@${domain}`;
}

function getAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  return token || null;
}

function parseOrder(payload: MercadoPagoOrder): PixCheckout {
  const payment = payload.transactions?.payments?.[0];
  if (!payload.id) throw new Error("Mercado Pago returned an order without an ID");
  return {
    orderId: payload.id,
    status: payload.status ?? "unknown",
    statusDetail: payload.status_detail ?? payment?.status_detail ?? null,
    qrCode: payment?.payment_method?.qr_code ?? null,
    qrCodeBase64: payment?.payment_method?.qr_code_base64 ?? null,
    ticketUrl: payment?.payment_method?.ticket_url ?? null,
  };
}

async function requestOrder(orderId: string): Promise<MercadoPagoOrder> {
  const token = getAccessToken();
  if (!token) throw new Error("Mercado Pago is not configured");
  const response = await fetch(`${API_BASE}/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Mercado Pago order lookup failed (${response.status})`);
  }
  return await response.json() as MercadoPagoOrder;
}

export async function createPixOrder(input: {
  purchaseId: string;
  paymentIdempotencyKey: string;
  playerId: string;
  amountCents: number;
}): Promise<PixCheckout | null> {
  const token = getAccessToken();
  if (!token) return null;
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 1) {
    throw new Error("Invalid Pix amount");
  }

  // An already persisted provider ID is reconciled instead of creating another order.
  const existingOrderId = process.env.MERCADOPAGO_RECONCILE_ORDER_ID?.trim();
  if (existingOrderId) {
    // This optional override is intentionally not used: provider IDs must come from Payment.
    throw new Error("Unexpected provider reconciliation override");
  }

  const amount = (input.amountCents / 100).toFixed(2);
  const response = await fetch(`${API_BASE}/v1/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.paymentIdempotencyKey,
    },
    body: JSON.stringify({
      type: "online",
      processing_mode: "automatic",
      total_amount: amount,
      external_reference: `jogaplacas_purchase_${input.purchaseId}`,
      payer: { email: syntheticPayerEmail(input.playerId) },
      transactions: {
        payments: [{
          amount,
          payment_method: { id: "pix", type: "bank_transfer" },
        }],
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    // Do not log provider bodies or credentials. The persisted idempotency key is
    // reused on retry, including when the network outcome was ambiguous.
    throw new Error(`Mercado Pago could not create the Pix order (${response.status})`);
  }

  const checkout = parseOrder(await response.json() as MercadoPagoOrder);
  if (!checkout.qrCode) {
    // Preserve the order ID in the caller before treating a missing QR as a failure.
    // The caller stores IDs only after this function returns, so reject incomplete responses.
    throw new Error("Mercado Pago order did not include Pix copy-and-paste data");
  }
  return checkout;
}

export async function getPixOrder(orderId: string): Promise<PixCheckout> {
  return parseOrder(await requestOrder(orderId));
}
