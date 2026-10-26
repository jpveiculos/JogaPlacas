import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoWebhookSignature } from "./mercado-pago";

describe("Mercado Pago webhook signature", () => {
  const secret = "test-webhook-secret";
  const dataId = "order-123";
  const requestId = "request-456";
  const timestamp = "1792972800";
  const nowMs = Number(timestamp) * 1000;
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  const signatureHeader = `ts=${timestamp},v1=${v1}`;

  it("accepts a matching signature within the timestamp window", () => {
    expect(verifyMercadoPagoWebhookSignature({
      dataId, requestId, signatureHeader, secret, nowMs,
    })).toBe(true);
  });

  it("rejects a modified resource ID", () => {
    expect(verifyMercadoPagoWebhookSignature({
      dataId: "order-other", requestId, signatureHeader, secret, nowMs,
    })).toBe(false);
  });

  it("rejects a modified request ID", () => {
    expect(verifyMercadoPagoWebhookSignature({
      dataId, requestId: "request-other", signatureHeader, secret, nowMs,
    })).toBe(false);
  });

  it("rejects malformed signatures and stale timestamps", () => {
    expect(verifyMercadoPagoWebhookSignature({
      dataId, requestId, signatureHeader: "ts=bad,v1=not-a-signature", secret, nowMs,
    })).toBe(false);
    expect(verifyMercadoPagoWebhookSignature({
      dataId, requestId, signatureHeader, secret, nowMs: nowMs + 6 * 60 * 1000,
    })).toBe(false);
  });
});
