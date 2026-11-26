import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db/open";
import { createRepo, OPENING_BALANCE_NOTE, type Repo } from "./repo";

const base = { phone: "+919876543210", creditLimit: null, notes: "", language: "hi" };
let repo: Repo;

beforeEach(() => {
  repo = createRepo(openDatabase(":memory:"));
});

describe("repository", () => {
  it("creates a customer with an opening balance entry", () => {
    const id = repo.createCustomer({ ...base, name: "Ramesh", dueDay: 10 }, 150000, "2026-11-01");
    const entries = repo.listEntries(id);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ type: "credit", amount: 150000, note: OPENING_BALANCE_NOTE, entryDate: "2026-11-01" });
    expect(repo.getBalance(id)).toBe(150000);
  });

  it("computes balance, overdue and status", () => {
    const id = repo.createCustomer({ ...base, name: "Sita", dueDay: 10 }, 0, "2026-10-01");
    repo.addEntry({ customerId: id, type: "credit", amount: 100000, note: "rice", entryDate: "2026-11-02" });
    repo.addEntry({ customerId: id, type: "payment", amount: 30000, note: "", entryDate: "2026-11-12" });
    repo.addEntry({ customerId: id, type: "credit", amount: 50000, note: "oil", entryDate: "2026-11-20" });

    const s = repo.getCustomerSummary(id, "2026-11-26")!;
    expect(s.balance).toBe(120000);
    expect(s.overdue).toBe(70000); // 1000 before 10 Nov minus 300 paid
    expect(s.status).toBe("overdue");
    expect(s.nextDue).toBe("2026-12-10");

    // Before the due date nothing is overdue, and it is due within 7 days
    const early = repo.getCustomerSummary(id, "2026-11-05")!;
    expect(early.overdue).toBe(0);
    expect(early.status).toBe("soon");
    expect(early.daysToDue).toBe(5);
  });

  it("edits with an audit trail and soft-deletes with restore", () => {
    const id = repo.createCustomer({ ...base, name: "Ali", dueDay: 5 }, 0, "2026-11-01");
    const entry = repo.addEntry({ customerId: id, type: "credit", amount: 20000, note: "sugar", entryDate: "2026-11-03" });

    repo.updateEntry(entry.id, { amount: 25000 });
    expect(repo.getBalance(id)).toBe(25000);
    expect(repo.getEntry(entry.id)!.editedAt).not.toBeNull();

    repo.softDeleteEntry(entry.id);
    expect(repo.getBalance(id)).toBe(0);
    expect(repo.listEntries(id)).toHaveLength(0);
    expect(() => repo.updateEntry(entry.id, { amount: 1 })).toThrow();

    repo.restoreEntry(entry.id);
    expect(repo.getBalance(id)).toBe(25000);

    const audit = repo.recentAudit();
    expect(audit.map((a) => a.action)).toEqual(["restore", "delete", "update"]);
    expect(JSON.parse(audit[2].before!).amount).toBe(20000);
    expect(JSON.parse(audit[2].after!).amount).toBe(25000);
  });

  it("lists entries with a running balance and totals outstanding", () => {
    const a = repo.createCustomer({ ...base, name: "A", dueDay: 1 }, 10000, "2026-11-01");
    const b = repo.createCustomer({ ...base, name: "B", dueDay: 1 }, 0, "2026-11-01");
    repo.addEntry({ customerId: a, type: "payment", amount: 4000, note: "", entryDate: "2026-11-02" });
    repo.addEntry({ customerId: b, type: "payment", amount: 5000, note: "advance", entryDate: "2026-11-02" });
    expect(repo.listEntries(a).map((e) => e.runningBalance)).toEqual([10000, 6000]);
    expect(repo.totalOutstanding()).toBe(6000); // advances do not reduce the total
    expect(repo.getCustomerSummary(b, "2026-11-26")!.status).toBe("advance");
  });

  it("builds a monthly statement", () => {
    const id = repo.createCustomer({ ...base, name: "M", dueDay: 15 }, 50000, "2026-10-20");
    repo.addEntry({ customerId: id, type: "credit", amount: 10000, note: "", entryDate: "2026-11-03" });
    repo.addEntry({ customerId: id, type: "payment", amount: 40000, note: "", entryDate: "2026-11-15" });
    repo.addEntry({ customerId: id, type: "credit", amount: 999, note: "", entryDate: "2026-12-01" });
    const st = repo.statement(id, "2026-11-01", "2026-11-30");
    expect(st.opening).toBe(50000);
    expect(st.totalCredit).toBe(10000);
    expect(st.totalPaid).toBe(40000);
    expect(st.closing).toBe(20000);
    expect(st.lines.map((l) => l.runningBalance)).toEqual([60000, 20000]);
    expect(repo.entryMonths(id)).toEqual(["2026-12", "2026-11", "2026-10"]);
  });

  it("issues pay tokens that expire after 30 days and reuses fresh ones", () => {
    const id = repo.createCustomer({ ...base, name: "Ramesh Kumar", dueDay: 1 }, 0, "2026-11-01");
    const now = new Date("2026-11-26T10:00:00Z");
    const t1 = repo.getOrCreatePayToken(id, 125000, now);
    expect(t1.length).toBeGreaterThanOrEqual(24);
    expect(repo.getOrCreatePayToken(id, 125000, now)).toBe(t1);
    expect(repo.getOrCreatePayToken(id, 99900, now)).not.toBe(t1);
    expect(repo.resolvePayToken(t1, now)).toEqual({ customerName: "Ramesh Kumar", amount: 125000 });
    expect(repo.resolvePayToken(t1, new Date("2026-12-27T10:00:00Z"))).toBe("expired");
    expect(repo.resolvePayToken("nope", now)).toBeNull();
    expect(repo.resolvePayToken("A".repeat(24), now)).toBeNull();
  });

  it("stores settings with default templates", () => {
    const s = repo.getSettings();
    expect(s.templates.en).toContain("{amount}");
    repo.saveSettings({ shopName: "Sharma Store", upiId: "sharma@okaxis", templates: { en: "Hi {name}", hi: "नमस्ते {name}" } });
    expect(repo.getSettings()).toEqual({ shopName: "Sharma Store", upiId: "sharma@okaxis", templates: { en: "Hi {name}", hi: "नमस्ते {name}" } });
  });

  it("logs reminders", () => {
    const id = repo.createCustomer({ ...base, name: "R", dueDay: 1 }, 0, "2026-11-01");
    repo.logReminder(id, "whatsapp_link", 5000);
    expect(repo.recentReminders()[0]).toMatchObject({ name: "R", channel: "whatsapp_link", amount: 5000 });
    expect(repo.lastReminderByCustomer().has(id)).toBe(true);
  });

  it("exports and re-imports everything", () => {
    const id = repo.createCustomer({ ...base, name: "X", dueDay: 3 }, 12300, "2026-11-01");
    repo.addEntry({ customerId: id, type: "payment", amount: 300, note: "", entryDate: "2026-11-02" });
    repo.saveSettings({ shopName: "S", upiId: "", templates: {} });
    const dump = JSON.parse(JSON.stringify(repo.exportAll()));

    const fresh = createRepo(openDatabase(":memory:"));
    fresh.importAll(dump);
    expect(fresh.getBalance(id)).toBe(12000);
    expect(fresh.getCustomer(id)!.name).toBe("X");
    expect(fresh.getSettings().shopName).toBe("S");
    // ids keep working after import
    const next = fresh.createCustomer({ ...base, name: "Y", dueDay: 3 }, 0, "2026-11-01");
    expect(next).toBeGreaterThan(id);
  });

  it("imports opening balances all at once", () => {
    const n = repo.importOpeningBalances(
      [
        { ...base, name: "One", dueDay: 5, balance: 1000 },
        { ...base, name: "Two", dueDay: 31, balance: 0 },
      ],
      "2026-11-26",
    );
    expect(n).toBe(2);
    const list = repo.listCustomerSummaries("2026-11-26");
    expect(list.map((c) => [c.name, c.balance])).toEqual([
      ["One", 1000],
      ["Two", 0],
    ]);
  });
});
