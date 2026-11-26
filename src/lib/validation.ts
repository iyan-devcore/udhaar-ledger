import { z } from "zod";
import { isValidISODate } from "@/lib/dates";
import { MAX_AMOUNT_PAISE, parseRupeesToPaise } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { LANGS } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";

/**
 * Server-side validation for everything a person can submit.
 * Error messages are dictionary keys so they can be shown in either language.
 */

const optionalRupees = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const p = parseRupeesToPaise(v);
    if (p === null || p > MAX_AMOUNT_PAISE) {
      ctx.addIssue({ code: "custom", message: "enterAmount" satisfies DictKey });
      return z.NEVER;
    }
    return p;
  });

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, "required" satisfies DictKey).max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .transform((v, ctx) => {
      const p = normalizePhone(v);
      if (p === null) {
        ctx.addIssue({ code: "custom", message: "invalidPhone" satisfies DictKey });
        return z.NEVER;
      }
      return p;
    }),
  dueDay: z.coerce.number().int().min(1, "dueDayHelp" satisfies DictKey).max(31, "dueDayHelp" satisfies DictKey),
  creditLimit: optionalRupees,
  openingBalance: optionalRupees.optional(),
  notes: z.string().trim().max(500).default(""),
  language: z.enum(LANGS as [string, ...string[]]).default("hi"),
  isActive: z.boolean().optional(),
});

export type CustomerFormErrors = Partial<Record<keyof z.input<typeof customerFormSchema>, DictKey>>;

export const entryTypeSchema = z.enum(["credit", "payment"]);

export const entryInputSchema = z.object({
  customerId: z.number().int().positive(),
  type: entryTypeSchema,
  amount: z.number().int().min(1, "enterAmount" satisfies DictKey).max(MAX_AMOUNT_PAISE, "enterAmount" satisfies DictKey),
  note: z.string().trim().max(200).default(""),
  entryDate: z.string().refine(isValidISODate, "date"),
});

export const entryUpdateSchema = entryInputSchema.omit({ customerId: true }).extend({
  id: z.number().int().positive(),
});

export const idSchema = z.number().int().positive();

/** Turns zod issues into { field: dictionaryKey }. */
export function fieldErrors<T extends string>(error: z.ZodError): Partial<Record<T, DictKey>> {
  const out: Partial<Record<string, DictKey>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= (issue.message in en ? issue.message : "errorGeneric") as DictKey;
  }
  return out as Partial<Record<T, DictKey>>;
}
