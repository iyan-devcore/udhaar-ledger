/**
 * In-memory limiter for failed login attempts. The app runs as a single
 * process for a single shop, so memory is enough; a restart clears it.
 *
 * - Per client: 5 failures in 15 minutes locks that client for 15 minutes.
 * - Overall: 20 failures in 15 minutes locks everyone out, so rotating IPs
 *   does not help a guesser.
 */

const WINDOW_MS = 15 * 60 * 1000;
const PER_CLIENT_LIMIT = 5;
const GLOBAL_LIMIT = 20;
const GLOBAL_KEY = "__all__";

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, list);
  return list;
}

/** Returns seconds to wait if locked, or 0 if a login attempt is allowed. */
export function loginRetryAfter(clientKey: string, now = Date.now()): number {
  const checks: Array<[string, number]> = [
    [clientKey, PER_CLIENT_LIMIT],
    [GLOBAL_KEY, GLOBAL_LIMIT],
  ];
  let wait = 0;
  for (const [key, limit] of checks) {
    const list = recent(key, now);
    if (list.length >= limit) {
      wait = Math.max(wait, Math.ceil((list[0] + WINDOW_MS - now) / 1000));
    }
  }
  return wait;
}

export function recordLoginFailure(clientKey: string, now = Date.now()): void {
  for (const key of [clientKey, GLOBAL_KEY]) {
    recent(key, now).push(now);
  }
}

export function clearLoginFailures(clientKey: string): void {
  failures.delete(clientKey);
}

/** For tests. */
export function resetRateLimiter(): void {
  failures.clear();
}
