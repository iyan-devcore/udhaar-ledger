import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt (no extra dependency).
 * Stored format: "scrypt$<salt base64url>$<hash base64url>".
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string, salt = randomBytes(16)): string {
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
