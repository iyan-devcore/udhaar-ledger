"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMutationAuth } from "@/lib/auth/guard";
import { backups } from "@/lib/backup-service";
import { LANGS } from "@/lib/i18n";
import { getLang } from "@/lib/i18n/server";
import { backupSchema, checkBackupLinks, parseOpeningBalancesCsv, type CsvRowError } from "@/lib/import-validation";
import { isValidVpa } from "@/lib/reminders/messages";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";

export type SimpleState = { ok?: boolean; error?: string; message?: string; rowErrors?: CsvRowError[] };

const MAX_UPLOAD = 9 * 1024 * 1024;

const shopSchema = z.object({
  shopName: z.string().trim().max(80),
  upiId: z
    .string()
    .trim()
    .max(100)
    .refine((v) => v === "" || isValidVpa(v), "upiIdHelp"),
});

export async function saveShopSettings(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireMutationAuth();
  const parsed = shopSchema.safeParse({ shopName: formData.get("shopName") ?? "", upiId: formData.get("upiId") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "errorGeneric" };
  const current = repo().getSettings();
  const templates: Record<string, string> = { ...current.templates };
  for (const lang of LANGS) {
    const value = formData.get(`template_${lang}`);
    if (typeof value === "string") templates[lang] = value.trim().slice(0, 1000);
  }
  repo().saveSettings({ ...parsed.data, templates });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function backupNow(): Promise<SimpleState> {
  await requireMutationAuth();
  const name = await backups.tagged("manual");
  revalidatePath("/settings");
  return { ok: true, message: name };
}

async function readUpload(formData: FormData): Promise<string | SimpleState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "chooseFile" };
  if (file.size > MAX_UPLOAD) return { error: "errorGeneric", message: "File is too large." };
  return file.text();
}

/** Replaces all data with a JSON backup, after saving a copy of the current data. */
export async function restoreFromJson(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireMutationAuth();
  const text = await readUpload(formData);
  if (typeof text !== "string") return text;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "errorGeneric", message: "This is not a JSON backup file." };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: "errorGeneric", message: `Not a valid backup (${issue?.path.join(".")}: ${issue?.message}).` };
  }
  const linkProblem = checkBackupLinks(parsed.data);
  if (linkProblem) return { error: "errorGeneric", message: linkProblem };

  await backups.tagged("pre-restore");
  repo().importAll(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: JSON.stringify({ customers: parsed.data.customers.length, entries: parsed.data.entries.length }) };
}

/** Loads customers with opening balances from the diary CSV. All rows or none. */
export async function importOpeningCsv(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireMutationAuth();
  const text = await readUpload(formData);
  if (typeof text !== "string") return text;

  const { rows, errors } = parseOpeningBalancesCsv(text);
  if (errors.length) return { error: "errorGeneric", rowErrors: errors.slice(0, 30) };
  if (rows.length === 0) return { error: "errorGeneric", message: "No customers found in the file." };
  if (rows.length > 2000) return { error: "errorGeneric", message: "Too many rows (max 2000)." };

  await backups.tagged("pre-import");
  const language = await getLang();
  const n = repo().importOpeningBalances(
    rows.map((r) => ({ ...r, creditLimit: null, notes: "", language })),
    today(),
  );
  revalidatePath("/", "layout");
  return { ok: true, message: String(n) };
}
