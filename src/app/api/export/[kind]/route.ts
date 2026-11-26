import { isLoggedIn } from "@/lib/auth/guard";
import { toCsv } from "@/lib/csv";
import { paiseToDecimal } from "@/lib/money";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";

export const dynamic = "force-dynamic";

/**
 * Downloads:
 *   /api/export/backup.json   everything, restorable from Settings
 *   /api/export/customers.csv one row per customer with balance
 *   /api/export/entries.csv   every entry (deleted ones marked)
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/export/[kind]">) {
  if (!(await isLoggedIn())) return new Response("Not logged in", { status: 401 });
  const { kind } = await ctx.params;
  const r = repo();
  const day = today();

  const download = (body: string, name: string, type: string) =>
    new Response(body, {
      headers: {
        "Content-Type": `${type}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });

  if (kind === "backup.json") {
    return download(JSON.stringify(r.exportAll(), null, 1), `udhar-backup-${day}.json`, "application/json");
  }

  if (kind === "customers.csv") {
    const rows = r.listCustomerSummaries(day, { includeInactive: true });
    const csv = toCsv([
      ["id", "name", "phone", "dueDay", "creditLimit", "balance", "overdue", "nextDue", "language", "active", "notes"],
      ...rows.map((c) => [
        c.id,
        c.name,
        c.phone,
        c.dueDay,
        c.creditLimit === null ? "" : paiseToDecimal(c.creditLimit),
        paiseToDecimal(c.balance),
        paiseToDecimal(c.overdue),
        c.nextDue,
        c.language,
        c.isActive ? "yes" : "no",
        c.notes,
      ]),
    ]);
    // BOM so Excel opens Hindi text correctly
    return download("﻿" + csv, `udhar-customers-${day}.csv`, "text/csv");
  }

  if (kind === "entries.csv") {
    const data = r.exportAll();
    const names = new Map(data.customers.map((c) => [c.id, c.name]));
    const csv = toCsv([
      ["id", "customerId", "customer", "date", "type", "amount", "note", "createdAt", "editedAt", "deletedAt"],
      ...data.entries.map((e) => [
        e.id,
        e.customerId,
        names.get(e.customerId) ?? "",
        e.entryDate,
        e.type,
        paiseToDecimal(e.amount),
        e.note,
        e.createdAt,
        e.editedAt ?? "",
        e.deletedAt ?? "",
      ]),
    ]);
    return download("﻿" + csv, `udhar-entries-${day}.csv`, "text/csv");
  }

  return new Response("Not found", { status: 404 });
}
