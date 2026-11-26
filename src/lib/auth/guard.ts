import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "./password";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, verifySessionToken } from "./session-token";

export class AuthError extends Error {}

/** True when the current request carries a valid session cookie. */
export async function isLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, env.sessionSecret);
}

/** Use at the top of every protected page. */
export async function requirePageAuth(): Promise<void> {
  if (!(await isLoggedIn())) redirect("/login");
}

/**
 * Use at the top of every Server Action and mutating route handler.
 * Checks the session and that the request came from our own origin (CSRF).
 * Next.js also checks Origin against Host for Server Actions; this is a
 * second, explicit layer that also covers route handlers.
 */
export async function requireMutationAuth(): Promise<void> {
  await assertSameOrigin();
  if (!(await isLoggedIn())) throw new AuthError("Not logged in");
}

export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) throw new AuthError("Missing origin");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AuthError("Bad origin");
  }
  if (originHost !== host) throw new AuthError("Cross-origin request blocked");
}

export async function startSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(env.sessionSecret), {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** A key that identifies the client for rate limiting. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

// When only APP_PASSWORD is set (local development), hash it once in memory
// so the comparison below is always a hashed, constant-time comparison.
let devHash: string | null = null;

export function checkPassword(candidate: string): boolean {
  if (env.passwordHash) return verifyPassword(candidate, env.passwordHash);
  if (env.passwordPlain) {
    devHash ??= hashPassword(env.passwordPlain);
    return verifyPassword(candidate, devHash);
  }
  return false;
}

/** Problems with configuration that stop login from working. */
export function configProblems(): string[] {
  const problems: string[] = [];
  if (!env.passwordHash && !env.passwordPlain) problems.push("Set APP_PASSWORD_HASH (or APP_PASSWORD for local use).");
  if (env.sessionSecret.length < 32) problems.push("Set SESSION_SECRET to a random string of at least 32 characters.");
  return problems;
}
