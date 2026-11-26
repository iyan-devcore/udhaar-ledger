import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db/open";
import { createRepo } from "@/lib/repo/repo";
import { ensureNightlyBackup, isBackupName, listBackups, makeTaggedBackup, pruneBackups } from "./backup";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-backup-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("backups", () => {
  it("makes one nightly copy per day that opens as a working database", async () => {
    const db = openDatabase(path.join(dir, "live.db"));
    const repo = createRepo(db);
    repo.createCustomer({ name: "A", phone: "", dueDay: 1, creditLimit: null, notes: "", language: "hi" }, 5000, "2026-11-26");

    const opts = { dir: path.join(dir, "backups"), keep: 14, timeZone: "Asia/Kolkata", now: new Date("2026-11-26T20:00:00Z") };
    expect(await ensureNightlyBackup(db.$client, opts)).toBe("ledger-2026-11-27.db"); // already 27th in India
    expect(await ensureNightlyBackup(db.$client, opts)).toBeNull();

    const copy = createRepo(openDatabase(path.join(opts.dir, "ledger-2026-11-27.db")));
    expect(copy.totalOutstanding()).toBe(5000);
  });

  it("keeps only the newest 14 of each kind", () => {
    const b = path.join(dir, "b");
    fs.mkdirSync(b);
    for (let d = 1; d <= 20; d++) fs.writeFileSync(path.join(b, `ledger-2026-10-${String(d).padStart(2, "0")}.db`), "x");
    for (let d = 1; d <= 3; d++) fs.writeFileSync(path.join(b, `ledger-2026-10-0${d}-120000-manual.db`), "x");
    fs.writeFileSync(path.join(b, "notes.txt"), "keep me");

    const deleted = pruneBackups(b, 14);
    expect(deleted).toHaveLength(6);
    expect(deleted).toContain("ledger-2026-10-01.db");
    const left = listBackups(b).map((f) => f.name);
    expect(left).toHaveLength(17);
    expect(left).toContain("ledger-2026-10-20.db");
    expect(left).not.toContain("ledger-2026-10-06.db");
    expect(fs.existsSync(path.join(b, "notes.txt"))).toBe(true);
  });

  it("names tagged copies and validates names", async () => {
    const db = openDatabase(":memory:");
    const name = await makeTaggedBackup(db.$client, "manual", { dir, keep: 14, timeZone: "Asia/Kolkata", now: new Date("2026-11-26T09:05:07Z") });
    expect(name).toBe("ledger-2026-11-26-143507-manual.db");
    expect(isBackupName(name)).toBe(true);
    expect(isBackupName("../etc/passwd")).toBe(false);
    expect(isBackupName("ledger-2026-11-26.db.partial")).toBe(false);
  });
});
