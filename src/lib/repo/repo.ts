import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, lte, lt, gte, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/open";
import { auditLog, customers, entries, payTokens, reminders, settings, type Customer, type Entry } from "@/lib/db/schema";
import { computeOverdue, customerStatus, dueInfo, withRunningBalance, type CustomerStatus, type EntryType } from "@/lib/balance";
import type { ISODate } from "@/lib/dates";
import { DEFAULT_TEMPLATES } from "@/lib/reminders/messages";

/**
 * The repository: every read and write of ledger data goes through here.
 * Nothing else imports the schema or runs queries, so moving to Postgres
 * later means changing this file and db/open.ts only.
 *
 * better-sqlite3 is synchronous, so these functions are synchronous too.
 */

export const OPENING_BALANCE_NOTE = "Opening balance";
export const PAY_TOKEN_DAYS = 30;

export type CustomerInput = {
  name: string;
  phone: string;
  dueDay: number;
  creditLimit: number | null;
  notes: string;
  language: string;
};

export type EntryInput = {
  customerId: number;
  type: EntryType;
  amount: number;
  note: string;
  entryDate: ISODate;
};

export type CustomerSummary = Customer & {
  balance: number;
  overdue: number;
  nextDue: ISODate;
  daysToDue: number;
  status: CustomerStatus;
  lastEntryDate: ISODate | null;
};

export type ShopSettings = {
  shopName: string;
  upiId: string;
  templates: Record<string, string>;
};

const nowIso = () => new Date().toISOString();
const json = (v: unknown) => JSON.stringify(v);

export function createRepo(db: DB) {
  // ---------- internal helpers ----------

  function audit(entityType: string, entityId: number | null, action: string, before: unknown, after: unknown) {
    db.insert(auditLog)
      .values({ entityType, entityId, action, before: before == null ? null : json(before), after: after == null ? null : json(after) })
      .run();
  }

  /** Totals per customer, excluding deleted entries. */
  function totalsByCustomer(): Map<number, { credits: number; payments: number; lastEntryDate: string | null }> {
    const rows = db
      .select({
        customerId: entries.customerId,
        credits: sql<number>`coalesce(sum(case when ${entries.type} = 'credit' then ${entries.amount} else 0 end), 0)`,
        payments: sql<number>`coalesce(sum(case when ${entries.type} = 'payment' then ${entries.amount} else 0 end), 0)`,
        lastEntryDate: sql<string | null>`max(${entries.entryDate})`,
      })
      .from(entries)
      .where(isNull(entries.deletedAt))
      .groupBy(entries.customerId)
      .all();
    return new Map(rows.map((r) => [r.customerId, r]));
  }

  function creditsUpTo(customerId: number, date: ISODate): number {
    const row = db
      .select({ total: sql<number>`coalesce(sum(${entries.amount}), 0)` })
      .from(entries)
      .where(and(eq(entries.customerId, customerId), eq(entries.type, "credit"), isNull(entries.deletedAt), lte(entries.entryDate, date)))
      .get();
    return row?.total ?? 0;
  }

  function summarize(c: Customer, totals: { credits: number; payments: number; lastEntryDate: string | null } | undefined, today: ISODate): CustomerSummary {
    const credits = totals?.credits ?? 0;
    const payments = totals?.payments ?? 0;
    const balance = credits - payments;
    const due = dueInfo(c.dueDay, today);
    const overdue = balance > 0 ? computeOverdue(creditsUpTo(c.id, due.lastPassedDue), payments, balance) : 0;
    return {
      ...c,
      balance,
      overdue,
      nextDue: due.nextDue,
      daysToDue: due.daysToDue,
      status: customerStatus(balance, overdue, due.daysToDue),
      lastEntryDate: totals?.lastEntryDate ?? null,
    };
  }

  // ---------- customers ----------

  function listCustomerSummaries(today: ISODate, opts: { includeInactive?: boolean } = {}): CustomerSummary[] {
    const rows = db
      .select()
      .from(customers)
      .where(opts.includeInactive ? undefined : eq(customers.isActive, true))
      .orderBy(asc(customers.name))
      .all();
    const totals = totalsByCustomer();
    return rows.map((c) => summarize(c, totals.get(c.id), today));
  }

  function getCustomer(id: number): Customer | undefined {
    return db.select().from(customers).where(eq(customers.id, id)).get();
  }

  function getCustomerSummary(id: number, today: ISODate): CustomerSummary | undefined {
    const c = getCustomer(id);
    if (!c) return undefined;
    return summarize(c, totalsByCustomer().get(id), today);
  }

  function getBalance(customerId: number): number {
    const t = totalsByCustomer().get(customerId);
    return (t?.credits ?? 0) - (t?.payments ?? 0);
  }

  /** Sum of all positive balances (money still to collect). */
  function totalOutstanding(): number {
    let total = 0;
    for (const t of totalsByCustomer().values()) total += Math.max(0, t.credits - t.payments);
    return total;
  }

  function createCustomer(input: CustomerInput, openingBalance: number, today: ISODate): number {
    return db.transaction((tx) => {
      const row = tx.insert(customers).values(input).returning({ id: customers.id }).get();
      if (openingBalance > 0) {
        tx.insert(entries)
          .values({ customerId: row.id, type: "credit", amount: openingBalance, note: OPENING_BALANCE_NOTE, entryDate: today })
          .run();
      }
      return row.id;
    });
  }

  function updateCustomer(id: number, input: Partial<CustomerInput> & { isActive?: boolean }): void {
    db.transaction((tx) => {
      const before = tx.select().from(customers).where(eq(customers.id, id)).get();
      if (!before) throw new Error("Customer not found");
      tx.update(customers).set(input).where(eq(customers.id, id)).run();
      const after = tx.select().from(customers).where(eq(customers.id, id)).get();
      tx.insert(auditLog)
        .values({ entityType: "customer", entityId: id, action: "update", before: json(before), after: json(after) })
        .run();
    });
  }

  // ---------- entries ----------

  /** Live entries for a customer, oldest first, with running balance. */
  function listEntries(customerId: number) {
    const rows = db
      .select()
      .from(entries)
      .where(and(eq(entries.customerId, customerId), isNull(entries.deletedAt)))
      .orderBy(asc(entries.entryDate), asc(entries.id))
      .all();
    return withRunningBalance(rows);
  }

  function getEntry(id: number): Entry | undefined {
    return db.select().from(entries).where(eq(entries.id, id)).get();
  }

  function addEntry(input: EntryInput): Entry {
    if (!getCustomer(input.customerId)) throw new Error("Customer not found");
    return db.insert(entries).values(input).returning().get();
  }

  function updateEntry(id: number, patch: Partial<Pick<EntryInput, "type" | "amount" | "note" | "entryDate">>): Entry {
    return db.transaction((tx) => {
      const before = tx.select().from(entries).where(eq(entries.id, id)).get();
      if (!before || before.deletedAt) throw new Error("Entry not found");
      const after = tx
        .update(entries)
        .set({ ...patch, editedAt: nowIso() })
        .where(eq(entries.id, id))
        .returning()
        .get();
      tx.insert(auditLog).values({ entityType: "entry", entityId: id, action: "update", before: json(before), after: json(after) }).run();
      return after;
    });
  }

  function softDeleteEntry(id: number): Entry {
    return db.transaction((tx) => {
      const before = tx.select().from(entries).where(eq(entries.id, id)).get();
      if (!before || before.deletedAt) throw new Error("Entry not found");
      const after = tx.update(entries).set({ deletedAt: nowIso() }).where(eq(entries.id, id)).returning().get();
      tx.insert(auditLog).values({ entityType: "entry", entityId: id, action: "delete", before: json(before), after: json(after) }).run();
      return after;
    });
  }

  function restoreEntry(id: number): Entry {
    return db.transaction((tx) => {
      const before = tx.select().from(entries).where(eq(entries.id, id)).get();
      if (!before || !before.deletedAt) throw new Error("Entry is not deleted");
      const after = tx.update(entries).set({ deletedAt: null }).where(eq(entries.id, id)).returning().get();
      tx.insert(auditLog).values({ entityType: "entry", entityId: id, action: "restore", before: json(before), after: json(after) }).run();
      return after;
    });
  }

  /** Data for a monthly statement: balance before the month, entries in it, closing balance. */
  function statement(customerId: number, start: ISODate, end: ISODate) {
    const opening = db
      .select({
        total: sql<number>`coalesce(sum(case when ${entries.type} = 'credit' then ${entries.amount} else -${entries.amount} end), 0)`,
      })
      .from(entries)
      .where(and(eq(entries.customerId, customerId), isNull(entries.deletedAt), lt(entries.entryDate, start)))
      .get()?.total ?? 0;
    const rows = db
      .select()
      .from(entries)
      .where(and(eq(entries.customerId, customerId), isNull(entries.deletedAt), gte(entries.entryDate, start), lte(entries.entryDate, end)))
      .orderBy(asc(entries.entryDate), asc(entries.id))
      .all();
    let running = opening;
    let totalCredit = 0;
    let totalPaid = 0;
    const lines = rows.map((e) => {
      if (e.type === "credit") {
        running += e.amount;
        totalCredit += e.amount;
      } else {
        running -= e.amount;
        totalPaid += e.amount;
      }
      return { ...e, runningBalance: running };
    });
    return { opening, lines, totalCredit, totalPaid, closing: running };
  }

  /** Months (YYYY-MM) that have entries for this customer, newest first. */
  function entryMonths(customerId: number): string[] {
    return db
      .selectDistinct({ ym: sql<string>`substr(${entries.entryDate}, 1, 7)` })
      .from(entries)
      .where(and(eq(entries.customerId, customerId), isNull(entries.deletedAt)))
      .orderBy(desc(sql`substr(${entries.entryDate}, 1, 7)`))
      .all()
      .map((r) => r.ym);
  }

  // ---------- settings ----------

  function getSettings(): ShopSettings {
    const rows = db.select().from(settings).all();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    let templates: Record<string, string> = { ...DEFAULT_TEMPLATES };
    try {
      templates = { ...templates, ...JSON.parse(map.get("templates") ?? "{}") };
    } catch {
      // keep defaults
    }
    return { shopName: map.get("shopName") ?? "", upiId: map.get("upiId") ?? "", templates };
  }

  function saveSettings(s: ShopSettings): void {
    db.transaction((tx) => {
      const values: Array<[string, string]> = [
        ["shopName", s.shopName],
        ["upiId", s.upiId],
        ["templates", json(s.templates)],
      ];
      for (const [key, value] of values) {
        tx.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
      }
    });
  }

  // ---------- reminders ----------

  function logReminder(customerId: number, channel: string, amount: number): void {
    db.insert(reminders).values({ customerId, channel, amount, sentAt: nowIso() }).run();
  }

  function lastReminderByCustomer(): Map<number, string> {
    const rows = db
      .select({ customerId: reminders.customerId, last: sql<string>`max(${reminders.sentAt})` })
      .from(reminders)
      .groupBy(reminders.customerId)
      .all();
    return new Map(rows.map((r) => [r.customerId, r.last]));
  }

  function recentReminders(limit = 20) {
    return db
      .select({ id: reminders.id, customerId: reminders.customerId, name: customers.name, channel: reminders.channel, amount: reminders.amount, sentAt: reminders.sentAt })
      .from(reminders)
      .innerJoin(customers, eq(customers.id, reminders.customerId))
      .orderBy(desc(reminders.sentAt))
      .limit(limit)
      .all();
  }

  // ---------- pay tokens ----------

  /**
   * Returns a valid token for this customer and amount, reusing one that has
   * at least 7 days left so repeated reminders do not pile up tokens.
   */
  function getOrCreatePayToken(customerId: number, amount: number, now = new Date()): string {
    const minExpiry = new Date(now.getTime() + 7 * 86_400_000).toISOString();
    const existing = db
      .select()
      .from(payTokens)
      .where(and(eq(payTokens.customerId, customerId), eq(payTokens.amount, amount), gt(payTokens.expiresAt, minExpiry)))
      .get();
    if (existing) return existing.token;
    const token = randomBytes(18).toString("base64url"); // 144 bits
    const expiresAt = new Date(now.getTime() + PAY_TOKEN_DAYS * 86_400_000).toISOString();
    db.insert(payTokens).values({ token, customerId, amount, createdAt: now.toISOString(), expiresAt }).run();
    return token;
  }

  /** Looks up a pay token. Returns only what the public page may show. */
  function resolvePayToken(token: string, now = new Date()): { customerName: string; amount: number; language: string } | null | "expired" {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
    const row = db
      .select({ amount: payTokens.amount, expiresAt: payTokens.expiresAt, name: customers.name, language: customers.language })
      .from(payTokens)
      .innerJoin(customers, eq(customers.id, payTokens.customerId))
      .where(eq(payTokens.token, token))
      .get();
    if (!row) return null;
    if (row.expiresAt <= now.toISOString()) return "expired";
    return { customerName: row.name, amount: row.amount, language: row.language };
  }

  function deleteExpiredPayTokens(now = new Date()): number {
    return db.delete(payTokens).where(lte(payTokens.expiresAt, now.toISOString())).run().changes;
  }

  // ---------- export / import ----------

  const EXPORT_VERSION = 1;

  function exportAll() {
    return {
      app: "udhar-ledger",
      version: EXPORT_VERSION,
      exportedAt: nowIso(),
      customers: db.select().from(customers).orderBy(asc(customers.id)).all(),
      entries: db.select().from(entries).orderBy(asc(entries.id)).all(),
      settings: db.select().from(settings).all(),
      reminders: db.select().from(reminders).orderBy(asc(reminders.id)).all(),
      payTokens: db.select().from(payTokens).all(),
      auditLog: db.select().from(auditLog).orderBy(asc(auditLog.id)).all(),
    };
  }

  type ExportData = ReturnType<typeof exportAll>;

  /** Replaces everything with the given export, in one transaction. */
  function importAll(data: Pick<ExportData, "customers" | "entries" | "settings"> & Partial<ExportData>): void {
    db.transaction((tx) => {
      tx.delete(payTokens).run();
      tx.delete(reminders).run();
      tx.delete(entries).run();
      tx.delete(customers).run();
      tx.delete(settings).run();
      tx.delete(auditLog).run();
      const chunk = <T,>(rows: T[], fn: (part: T[]) => void) => {
        for (let i = 0; i < rows.length; i += 200) fn(rows.slice(i, i + 200));
      };
      chunk(data.customers, (p) => tx.insert(customers).values(p).run());
      chunk(data.entries, (p) => tx.insert(entries).values(p).run());
      chunk(data.settings, (p) => tx.insert(settings).values(p).run());
      chunk(data.reminders ?? [], (p) => tx.insert(reminders).values(p).run());
      chunk(data.payTokens ?? [], (p) => tx.insert(payTokens).values(p).run());
      chunk(data.auditLog ?? [], (p) => tx.insert(auditLog).values(p).run());
      tx.insert(auditLog)
        .values({ entityType: "data", entityId: null, action: "import", before: null, after: json({ customers: data.customers.length, entries: data.entries.length }) })
        .run();
    });
  }

  /** Bulk-adds customers with opening balances (diary import). All or nothing. */
  function importOpeningBalances(rows: Array<CustomerInput & { balance: number }>, today: ISODate): number {
    return db.transaction(() => {
      for (const { balance, ...input } of rows) createCustomer(input, balance, today);
      audit("data", null, "import", null, { openingBalances: rows.length });
      return rows.length;
    });
  }

  function recentAudit(limit = 50) {
    return db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(limit).all();
  }

  return {
    listCustomerSummaries,
    getCustomer,
    getCustomerSummary,
    getBalance,
    totalOutstanding,
    createCustomer,
    updateCustomer,
    listEntries,
    getEntry,
    addEntry,
    updateEntry,
    softDeleteEntry,
    restoreEntry,
    statement,
    entryMonths,
    getSettings,
    saveSettings,
    logReminder,
    lastReminderByCustomer,
    recentReminders,
    getOrCreatePayToken,
    resolvePayToken,
    deleteExpiredPayTokens,
    exportAll,
    importAll,
    importOpeningBalances,
    recentAudit,
  };
}

export type Repo = ReturnType<typeof createRepo>;
export type ExportData = ReturnType<Repo["exportAll"]>;
