import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 1024) {
    throw new Error("Password must be between 12 characters and 1024 UTF-8 bytes");
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: MAX_MEMORY,
  }) as Buffer;
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [algorithm, nText, rText, pText, saltText, hashText, ...extra] = encoded.split("$");
    if (algorithm !== "scrypt" || extra.length || !nText || !rText || !pText || !saltText || !hashText) return false;
    const N = Number(nText), r = Number(rText), p = Number(pText);
    if (N !== COST || r !== BLOCK_SIZE || p !== PARALLELIZATION) return false;
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const actual = await scrypt(password, salt, KEY_LENGTH, {
      N, r, p, maxmem: MAX_MEMORY,
    }) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
