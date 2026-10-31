import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedPixOrder: vi.fn(),
  classifyPixOrderStatus: vi.fn(),
  confirmPixPayment: vi.fn(),
}));

vi.mock("@/modules/payments/mercado-pago", () => ({
  getVerifiedPixOrder: mocks.getVerifiedPixOrder,
  classifyPixOrderStatus: mocks.classifyPixOrderStatus,
}));
vi.mock("@/modules/payments/confirm-payment", () => ({
  confirmPixPayment: mocks.confirmPixPayment,
}));

import { reconcilePixPaymentFromProvider } from "./reconcile-pix-payment";

function makePrisma() {
  return {
    payment: {
      findUnique: vi.fn().mockResolvedValue({
        id: "payment-1",
        purchaseId: "purchase-1",
        provider: "MERCADO_PAGO",
        providerPaymentId: "order-1",
        amountCents: 200,
        status: "PENDING",
        purchase: { totalCents: 200, status: "PENDING_PAYMENT" },
      }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(),
  };
}

describe("reconcilePixPaymentFromProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedPixOrder.mockResolvedValue({
      orderId: "order-1",
      externalReference: "jogaplacas_purchase_purchase-1",
      currency: "BRL",
      amountCents: 200,
      status: "created",
      statusDetail: null,
      paymentStatus: null,
      paymentAmountCents: null,
      paymentMethodId: null,
      paymentMethodType: null,
    });
    mocks.classifyPixOrderStatus.mockReturnValue({
      providerStatus: "created",
      normalizedStatus: "created",
      approved: false,
    });
    mocks.confirmPixPayment.mockResolvedValue({ outcome: "confirmed" });
  });

  it("keeps an ordinary pending order pending when payment transaction fields do not exist yet", async () => {
    const prisma = makePrisma();
    await expect(reconcilePixPaymentFromProvider(prisma as never, "payment-1")).resolves.toBe("still_pending");
    expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { providerStatus: "created", providerStatusDetail: null },
    }));
    expect(mocks.confirmPixPayment).not.toHaveBeenCalled();
  });

  it("uses the shared idempotent confirmation for a verified Pix approval", async () => {
    const prisma = makePrisma();
    mocks.getVerifiedPixOrder.mockResolvedValue({
      orderId: "order-1",
      externalReference: "jogaplacas_purchase_purchase-1",
      currency: "BRL",
      amountCents: 200,
      status: "processed",
      statusDetail: "accredited",
      paymentStatus: "processed",
      paymentAmountCents: 200,
      paymentMethodId: "pix",
      paymentMethodType: "bank_transfer",
    });
    mocks.classifyPixOrderStatus.mockReturnValue({
      providerStatus: "processed",
      normalizedStatus: "processed",
      approved: true,
    });

    await expect(reconcilePixPaymentFromProvider(prisma as never, "payment-1")).resolves.toBe("confirmed");
    expect(mocks.confirmPixPayment).toHaveBeenCalledWith(prisma, {
      paymentId: "payment-1",
      providerStatus: "processed",
      providerStatusDetail: "accredited",
    });
  });

  it("rejects an approved order that is not a Pix bank transfer", async () => {
    const prisma = makePrisma();
    mocks.getVerifiedPixOrder.mockResolvedValue({
      orderId: "order-1",
      externalReference: "jogaplacas_purchase_purchase-1",
      currency: "BRL",
      amountCents: 200,
      status: "processed",
      statusDetail: "accredited",
      paymentStatus: "processed",
      paymentAmountCents: 200,
      paymentMethodId: "visa",
      paymentMethodType: "credit_card",
    });
    mocks.classifyPixOrderStatus.mockReturnValue({
      providerStatus: "processed",
      normalizedStatus: "processed",
      approved: true,
    });

    await expect(reconcilePixPaymentFromProvider(prisma as never, "payment-1")).rejects.toThrow(
      "Mercado Pago order does not match the pending Pix purchase",
    );
    expect(mocks.confirmPixPayment).not.toHaveBeenCalled();
  });
});
