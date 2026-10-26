import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyBytes() {
  const configured = process.env.WALLET_PIX_ENCRYPTION_KEY;
  if (!configured) throw new Error("WALLET_PIX_ENCRYPTION_KEY_MISSING");
  const key = /^[a-fA-F0-9]{64}$/.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) throw new Error("WALLET_PIX_ENCRYPTION_KEY_INVALID");
  return key;
}

export function encryptPixKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptPixKey(value: string) {
  const [version, ivText, tagText, dataText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !dataText) throw new Error("PIX_KEY_CIPHERTEXT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataText, "base64")), decipher.final()]).toString("utf8");
}

export function maskPixKey(value: string) {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return (local.length <= 2 ? local[0] ?? "*" : local.slice(0, 2) + "***") + "@" + domain;
  }
  return value.length <= 4 ? "••••" : "••••••" + value.slice(-4);
}
