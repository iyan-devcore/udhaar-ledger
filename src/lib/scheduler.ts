import path from "node:path";
import { openDatabase, type DB } from "@/lib/db/open";
import { ensureNightlyBackup } from "@/lib/backup";
import { createRepo } from "@/lib/repo/repo";

/**
 * In-process nightly backup timer, started once from instrumentation.ts.
 * Every hour it checks whether today's copy exists and makes it if not, so a
 * copy is taken shortly after midnight (or at the first check after the
 * server wakes up). It also clears expired pay links.
 *
 * This file avoids "server-only" imports because instrumentation runs outside
 * the React Server environment. It shares the same globalThis connection as
 * db/client.ts.
 */
export function startScheduler(): void {
  const g = globalThis as unknown as { __ledgerDb?: DB; __ledgerScheduler?: boolean };
  if (g.__ledgerScheduler) return;
  g.__ledgerScheduler = true;

  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.BACKUP_DIR ?? "./data/backups");
  const keep = Number(process.env.BACKUP_KEEP ?? 14);
  const timeZone = process.env.APP_TIMEZONE ?? "Asia/Kolkata";

  const tick = async () => {
    try {
      g.__ledgerDb ??= openDatabase(path.resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/ledger.db"));
      const made = await ensureNightlyBackup(g.__ledgerDb.$client, { dir, keep, timeZone });
      if (made) console.log(`[backup] saved ${made}`);
      createRepo(g.__ledgerDb).deleteExpiredPayTokens();
    } catch (err) {
      console.error("[backup] failed", err);
    }
  };
  setTimeout(tick, 15_000).unref?.();
  setInterval(tick, 60 * 60 * 1000).unref?.();
}
