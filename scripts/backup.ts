/**
 * Makes a backup copy of the database from the command line, for use with
 * cron or before maintenance. The app also does this by itself every night.
 * Usage: npm run backup            (nightly copy, skipped if today's exists)
 *        npm run backup -- --now   (extra copy right now)
 */
import path from "node:path";
import { openDatabase } from "../src/lib/db/open";
import { ensureNightlyBackup, makeTaggedBackup } from "../src/lib/backup";

const db = openDatabase(path.resolve(process.env.DATABASE_PATH ?? "./data/ledger.db"));
const opts = {
  dir: path.resolve(process.env.BACKUP_DIR ?? "./data/backups"),
  keep: Number(process.env.BACKUP_KEEP ?? 14),
  timeZone: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
};

async function main() {
  const name = process.argv.includes("--now")
    ? await makeTaggedBackup(db.$client, "manual", opts)
    : await ensureNightlyBackup(db.$client, opts);
  console.log(name ? `Saved ${path.join(opts.dir, name)}` : "Today's backup already exists.");
  db.$client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
