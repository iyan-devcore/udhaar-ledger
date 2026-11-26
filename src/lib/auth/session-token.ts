import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless session token: base64url(JSON payload) + "." + HMAC-SHA256 signature.
 * There is only one user, so the payload is just issue and expiry times.
 * Rotating SESSION_SECRET logs every device out.
 */

export const SESSION_COOKIE = "ledger_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type Payload = { iat: number; exp: number };

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: Payload = { iat, exp: iat + SESSION_MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token || !secret) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return typeof payload.exp === "number" && payload.exp * 1000 > now;
  } catch {
    return false;
  }
}
