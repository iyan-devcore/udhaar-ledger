import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

/**
 * SQLite file backups.
 *
 * - Nightly copies are named   ledger-YYYY-MM-DD.db
 * - Other copies (manual, before a restore) are named
 *                              ledger-YYYY-MM-DD-HHMMSS-<tag>.db
 * Each group keeps the newest `keep` files (14 by default).
 *
 * Copies use SQLite's online backup API, so they are consistent even while
 * the app is writing.
 */

const NIGHTLY = /^ledger-\d{4}-\d{2}-\d{2}\.db$/;
const EXTRA = /^ledger-\d{4}-\d{2}-\d{2}-\d{6}-[a-z-]+\.db$/;

export type BackupFile = { name: string; size: number; createdAt: string };

export async function backupTo(sqlite: Database.Database, file: string): Promise<string> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.partial`;
  await sqlite.backup(tmp);
  fs.renameSync(tmp, file);
  return file;
}

function stamp(now: Date, timeZone: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}${parts.minute}${parts.second}` };
}

export function listBackups(dir: string): BackupFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => NIGHTLY.test(n) || EXTRA.test(n))
    .map((name) => {
      const st = fs.statSync(path.join(dir, name));
      return { name, size: st.size, createdAt: st.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.name.localeCompare(a.name));
}

/** Deletes all but the newest `keep` files in each group. Returns deleted names. */
export function pruneBackups(dir: string, keep: number): string[] {
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir);
  const deleted: string[] = [];
  for (const pattern of [NIGHTLY, EXTRA]) {
    // Names start with the date (and time), so sorting by name is sorting by age.
    const group = names.filter((n) => pattern.test(n)).sort().reverse();
    for (const name of group.slice(Math.max(keep, 1))) {
      fs.rmSync(path.join(dir, name), { force: true });
      deleted.push(name);
    }
  }
  return deleted;
}

/** Makes today's nightly copy if it does not exist yet. Returns the file name or null. */
export async function ensureNightlyBackup(
  sqlite: Database.Database,
  opts: { dir: string; keep: number; timeZone: string; now?: Date },
): Promise<string | null> {
  const { date } = stamp(opts.now ?? new Date(), opts.timeZone);
  const name = `ledger-${date}.db`;
  const file = path.join(opts.dir, name);
  if (fs.existsSync(file)) return null;
  await backupTo(sqlite, file);
  pruneBackups(opts.dir, opts.keep);
  return name;
}

/** Makes an extra, tagged copy right now (for "Back up now" and before restores). */
export async function makeTaggedBackup(
  sqlite: Database.Database,
  tag: "manual" | "pre-restore" | "pre-import",
  opts: { dir: string; keep: number; timeZone: string; now?: Date },
): Promise<string> {
  const { date, time } = stamp(opts.now ?? new Date(), opts.timeZone);
  const name = `ledger-${date}-${time}-${tag}.db`;
  await backupTo(sqlite, path.join(opts.dir, name));
  pruneBackups(opts.dir, opts.keep);
  return name;
}

/** True if the name is one of our backup files (guards download paths). */
export function isBackupName(name: string): boolean {
  return NIGHTLY.test(name) || EXTRA.test(name);
}
