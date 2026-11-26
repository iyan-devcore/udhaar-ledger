import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { formatDayMonth, lastPassedDueDate } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { getDict, isLang } from "@/lib/i18n";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";
import { DEFAULT_TEMPLATES, dropSentenceWith, firstName, renderTemplate } from "./messages";
import { getReminderProvider, type ReminderResult } from "./provider";

/** Public base URL for /pay links: PUBLIC_BASE_URL, or the address this request came in on. */
async function baseUrl(): Promise<string> {
  if (env.publicBaseUrl) return env.publicBaseUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export type PrepareResult = { ok: true; result: ReminderResult } | { ok: false; error: "noPhone" | "paidUp" | "notFound" };

/**
 * Builds and "sends" one reminder: creates (or reuses) a pay link for the
 * current balance, fills the template in the customer's language, hands it
 * to the provider and logs it.
 */
export async function sendReminder(customerId: number): Promise<PrepareResult> {
  const r = repo();
  const day = today();
  const c = r.getCustomerSummary(customerId, day);
  if (!c) return { ok: false, error: "notFound" };
  if (!c.phone) return { ok: false, error: "noPhone" };
  if (c.balance <= 0) return { ok: false, error: "paidUp" };

  const settings = r.getSettings();
  const lang = isLang(c.language) ? c.language : "hi";
  const token = r.getOrCreatePayToken(c.id, c.balance);
  const upiLink = settings.upiId ? `${await baseUrl()}/pay/${token}` : "";
  // Overdue customers are reminded of the date that has passed.
  const dueDate = c.overdue > 0 ? lastPassedDueDate(c.dueDay, day) : c.nextDue;
  const vars = {
    name: firstName(c.name),
    amount: formatPaise(c.balance),
    dueDate: formatDayMonth(dueDate, lang),
    shopName: settings.shopName || getDict(lang).appName,
    upiLink,
  };
  let template = settings.templates[lang] || DEFAULT_TEMPLATES[lang] || DEFAULT_TEMPLATES.en;
  if (!upiLink) template = dropSentenceWith(template, "upiLink");
  const message = renderTemplate(template, vars).replace(/[ \t]+$/gm, "");

  const provider = getReminderProvider();
  const result = await provider.send({ customerId: c.id, phone: c.phone, language: lang, message, vars });
  r.logReminder(c.id, provider.channel, c.balance);
  return { ok: true, result };
}
