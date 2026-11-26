import "server-only";
import { getDb } from "@/lib/db/client";
import { env } from "@/lib/env";
import { ensureNightlyBackup, listBackups, makeTaggedBackup } from "@/lib/backup";

const opts = () => ({ dir: env.backupDir, keep: env.backupKeep, timeZone: env.timeZone });

/** Backup operations for Server Actions and pages. */
export const backups = {
  list: () => listBackups(env.backupDir),
  nightly: () => ensureNightlyBackup(getDb().$client, opts()),
  tagged: (tag: "manual" | "pre-restore" | "pre-import") => makeTaggedBackup(getDb().$client, tag, opts()),
};
