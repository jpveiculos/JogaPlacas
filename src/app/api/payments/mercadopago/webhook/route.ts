/**
 * Compatibilidade com a URL de webhook já cadastrada no Mercado Pago.
 * A implementação canônica fica em /api/webhooks/mercado-pago.
 */
export { POST, runtime, dynamic } from "../../../webhooks/mercado-pago/route";
