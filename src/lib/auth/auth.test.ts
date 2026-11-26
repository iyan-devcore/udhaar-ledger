import { describe, expect, it, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session-token";
import { loginRetryAfter, recordLoginFailure, resetRateLimiter, clearLoginFailures } from "./rate-limit";

const SECRET = "x".repeat(40);

describe("password hashing", () => {
  it("verifies the right password and rejects others", () => {
    const stored = hashPassword("dukaan-1234");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("dukaan-1234", stored)).toBe(true);
    expect(verifyPassword("dukaan-12345", stored)).toBe(false);
    expect(verifyPassword("dukaan-1234", "garbage")).toBe(false);
  });
});

describe("session token", () => {
  it("accepts a fresh token and rejects tampering, wrong secret and expiry", () => {
    const now = Date.UTC(2026, 10, 26);
    const token = createSessionToken(SECRET, now);
    expect(verifySessionToken(token, SECRET, now + 1000)).toBe(true);
    expect(verifySessionToken(token, "y".repeat(40), now)).toBe(false);
    expect(verifySessionToken(token + "a", SECRET, now)).toBe(false);
    expect(verifySessionToken(token, SECRET, now + (SESSION_MAX_AGE_SECONDS + 1) * 1000)).toBe(false);
    expect(verifySessionToken(undefined, SECRET, now)).toBe(false);
    expect(verifySessionToken(token, "", now)).toBe(false);
  });
});

describe("login rate limit", () => {
  beforeEach(() => resetRateLimiter());

  it("locks a client after 5 failures and unlocks after 15 minutes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) recordLoginFailure("a", t0);
    expect(loginRetryAfter("a", t0)).toBe(0);
    recordLoginFailure("a", t0);
    expect(loginRetryAfter("a", t0)).toBeGreaterThan(0);
    expect(loginRetryAfter("b", t0)).toBe(0);
    expect(loginRetryAfter("a", t0 + 15 * 60 * 1000 + 1)).toBe(0);
  });

  it("locks everyone after 20 failures from many clients", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 20; i++) recordLoginFailure(`ip${i}`, t0);
    expect(loginRetryAfter("fresh", t0)).toBeGreaterThan(0);
  });

  it("clears a client's failures after a successful login", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 5; i++) recordLoginFailure("c", t0);
    clearLoginFailures("c");
    expect(loginRetryAfter("c", t0)).toBe(0);
  });
});
