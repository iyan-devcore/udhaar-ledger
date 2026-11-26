import { phoneForWhatsApp } from "@/lib/phone";
import { paiseToDecimal } from "@/lib/money";

/**
 * Pure builders for reminder messages, WhatsApp links and UPI links.
 * No network calls happen here: they only build strings.
 */

export const TEMPLATE_PLACEHOLDERS = ["name", "amount", "dueDate", "shopName", "upiLink"] as const;
export type TemplateVars = Record<(typeof TEMPLATE_PLACEHOLDERS)[number], string>;

export const DEFAULT_TEMPLATES: Record<string, string> = {
  en: "Namaste {name}, your balance at {shopName} is {amount}, due on {dueDate}. You can pay here: {upiLink}\nThank you!",
  hi: "नमस्ते {name} जी, {shopName} पर आपका बाकी {amount} है, {dueDate} तक देना है। यहाँ से भुगतान कर सकते हैं: {upiLink}\nधन्यवाद!",
};

/**
 * Fills {placeholders}. Unknown placeholders are left untouched so a typo in
 * Settings is visible instead of silently vanishing. If {upiLink} is empty,
 * a trailing "pay here:" style phrase is still kept; the shop can edit it.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key as keyof TemplateVars] : match,
  );
}

/** WhatsApp click-to-chat link: https://wa.me/<digits>?text=<urlencoded> */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phoneForWhatsApp(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type UpiParams = {
  vpa: string; // UPI ID, e.g. "shop@okaxis"
  payeeName: string;
  amountPaise: number;
  note?: string;
};

/** upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note> */
export function buildUpiLink({ vpa, payeeName, amountPaise, note }: UpiParams): string {
  const parts = [
    // Keep "@" literal: some UPI apps do not decode %40 in the payee address.
    `pa=${encodeURIComponent(vpa.trim()).replace(/%40/g, "@")}`,
    `pn=${encodeURIComponent(payeeName.trim())}`,
    `am=${paiseToDecimal(amountPaise)}`,
    "cu=INR",
  ];
  if (note) parts.push(`tn=${encodeURIComponent(note.slice(0, 50))}`);
  return `upi://pay?${parts.join("&")}`;
}

/** Basic shape check for a UPI ID (handle@bank). */
export function isValidVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/.test(vpa.trim());
}

/** Only the first name is ever shown on the public pay page. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * Removes the sentence (or line) that contains {key}. Used when the shop has
 * no UPI ID yet, so "You can pay here: {upiLink}" disappears cleanly.
 */
export function dropSentenceWith(template: string, key: string): string {
  const marker = `{${key}}`;
  if (!template.includes(marker)) return template;
  return template
    .split(/(?<=[.!?।\n])/)
    .map((part) => (part.includes(marker) ? (part.endsWith("\n") ? "\n" : "") : part))
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
