import { z } from "zod";
import { isValidISODate } from "@/lib/dates";
import { parseCsv } from "@/lib/csv";
import { MAX_AMOUNT_PAISE, parseRupeesToPaise } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";

/** Shape of a JSON backup made by /api/export/backup.json. */
const int = z.number().int();
const iso = z.string().min(1);

export const backupSchema = z.object({
  app: z.literal("udhar-ledger"),
  version: z.literal(1),
  customers: z.array(
    z.object({
      id: int.positive(),
      name: z.string().min(1).max(200),
      phone: z.string().max(20),
      dueDay: int.min(1).max(31),
      creditLimit: int.min(0).nullable(),
      notes: z.string().max(2000),
      language: z.string().max(10),
      isActive: z.boolean(),
      createdAt: iso,
    }),
  ),
  entries: z.array(
    z.object({
      id: int.positive(),
      customerId: int.positive(),
      type: z.enum(["credit", "payment"]),
      amount: int.min(1).max(MAX_AMOUNT_PAISE),
      note: z.string().max(1000),
      entryDate: z.string().refine(isValidISODate),
      createdAt: iso,
      editedAt: z.string().nullable(),
      deletedAt: z.string().nullable(),
    }),
  ),
  settings: z.array(z.object({ key: z.string(), value: z.string() })),
  reminders: z
    .array(z.object({ id: int.positive(), customerId: int.positive(), channel: z.string(), amount: int, sentAt: iso }))
    .default([]),
  payTokens: z
    .array(z.object({ token: z.string().min(16), customerId: int.positive(), amount: int, createdAt: iso, expiresAt: iso }))
    .default([]),
  auditLog: z
    .array(
      z.object({
        id: int.positive(),
        entityType: z.string(),
        entityId: int.nullable(),
        action: z.string(),
        before: z.string().nullable(),
        after: z.string().nullable(),
        at: iso,
      }),
    )
    .default([]),
});

export type BackupData = z.infer<typeof backupSchema>;

/** Checks that every entry, reminder and token points at a customer in the file. */
export function checkBackupLinks(data: BackupData): string | null {
  const ids = new Set(data.customers.map((c) => c.id));
  const bad = [...data.entries, ...data.reminders, ...data.payTokens].find((r) => !ids.has(r.customerId));
  return bad ? `Entry points to missing customer ${bad.customerId}` : null;
}

export type OpeningRow = { name: string; phone: string; balance: number; dueDay: number };
export type CsvRowError = { row: number; message: string };

/**
 * Parses the diary CSV: name, phone, balance, dueDay (header row required,
 * columns in any order, header names not case sensitive).
 */
export function parseOpeningBalancesCsv(text: string): { rows: OpeningRow[]; errors: CsvRowError[] } {
  const table = parseCsv(text);
  const errors: CsvRowError[] = [];
  if (table.length < 2) return { rows: [], errors: [{ row: 1, message: "The file needs a header row and at least one customer." }] };

  const header = table[0].map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ""));
  const col = (name: string) => header.indexOf(name);
  const idx = { name: col("name"), phone: col("phone"), balance: col("balance"), dueDay: col("dueday") };
  const missing = Object.entries(idx)
    .filter(([, i]) => i < 0)
    .map(([k]) => k);
  if (missing.length) return { rows: [], errors: [{ row: 1, message: `Missing column: ${missing.join(", ")}` }] };

  const rows: OpeningRow[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, i) => {
    const rowNo = i + 2;
    const get = (k: keyof typeof idx) => (cells[idx[k]] ?? "").trim();
    const name = get("name");
    const phone = normalizePhone(get("phone"));
    const balance = get("balance") === "" ? 0 : parseRupeesToPaise(get("balance"));
    const dueDay = Number(get("dueDay"));
    const problems: string[] = [];
    if (!name || name.length > 80) problems.push("name is missing");
    if (phone === null) problems.push(`phone "${get("phone")}" is not a 10 digit mobile`);
    if (balance === null || balance > MAX_AMOUNT_PAISE) problems.push(`balance "${get("balance")}" is not an amount`);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) problems.push(`dueDay "${get("dueDay")}" must be 1 to 31`);
    const key = name.toLowerCase();
    if (name && seen.has(key)) problems.push(`"${name}" appears twice`);
    seen.add(key);
    if (problems.length) errors.push({ row: rowNo, message: problems.join("; ") });
    else rows.push({ name, phone: phone!, balance: balance!, dueDay });
  });
  return { rows, errors };
}
