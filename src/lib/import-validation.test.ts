import { describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db/open";
import { createRepo } from "@/lib/repo/repo";
import { backupSchema, checkBackupLinks, parseOpeningBalancesCsv } from "./import-validation";

describe("diary CSV import", () => {
  it("reads rows in any column order", () => {
    const { rows, errors } = parseOpeningBalancesCsv("Due Day,Name,Phone,Balance\n10,Ramesh,98765 43210,\"1,250.50\"\n31,Sita,,0\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { name: "Ramesh", phone: "+919876543210", balance: 125050, dueDay: 10 },
      { name: "Sita", phone: "", balance: 0, dueDay: 31 },
    ]);
  });

  it("reports every bad row with its line number", () => {
    const { errors } = parseOpeningBalancesCsv("name,phone,balance,dueDay\n,123,abc,40\nRam,9876543210,10,5\nram,9876543211,5,5\n");
    expect(errors.map((e) => e.row)).toEqual([2, 4]);
    expect(errors[0].message).toContain("name is missing");
    expect(errors[0].message).toContain("dueDay");
    expect(errors[1].message).toContain("twice");
  });

  it("requires the four columns", () => {
    expect(parseOpeningBalancesCsv("name,balance\nA,1\n").errors[0].message).toContain("phone");
  });
});

describe("JSON backup validation", () => {
  it("accepts a real export and rejects broken ones", () => {
    const repo = createRepo(openDatabase(":memory:"));
    const id = repo.createCustomer({ name: "A", phone: "", dueDay: 1, creditLimit: null, notes: "", language: "hi" }, 100, "2026-11-01");
    repo.logReminder(id, "whatsapp_link", 100);
    const dump = JSON.parse(JSON.stringify(repo.exportAll()));
    const parsed = backupSchema.safeParse(dump);
    expect(parsed.success).toBe(true);
    expect(checkBackupLinks(parsed.data!)).toBeNull();

    expect(backupSchema.safeParse({ ...dump, app: "other" }).success).toBe(false);
    const orphan = backupSchema.parse({ ...dump, entries: [{ ...dump.entries[0], customerId: 999 }] });
    expect(checkBackupLinks(orphan)).toContain("999");
  });
});
