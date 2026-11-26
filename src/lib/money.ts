/**
 * Money is always stored and computed as integer paise (1 rupee = 100 paise).
 * These helpers are the only place rupees are parsed or formatted.
 */

/** Groups digits the Indian way: 1234567 -> "12,34,567". */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/**
 * Formats paise as rupees: 12345600 -> "₹1,23,456", 12345650 -> "₹1,23,456.50".
 * Paise are shown only when they are not zero. Negative values get a leading minus.
 */
export function formatPaise(paise: number, opts: { symbol?: boolean } = {}): string {
  const symbol = opts.symbol ?? true;
  if (!Number.isInteger(paise)) throw new Error(`Paise must be an integer, got ${paise}`);
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  const main = groupIndian(String(rupees));
  const frac = rem === 0 ? "" : "." + String(rem).padStart(2, "0");
  return `${sign}${symbol ? "₹" : ""}${main}${frac}`;
}

/** Plain decimal rupees for machine use (UPI links, CSV): 12345 -> "123.45". */
export function paiseToDecimal(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Maximum single amount accepted: ₹1 crore. Guards against typos like extra zeros. */
export const MAX_AMOUNT_PAISE = 1_00_00_000 * 100;

/**
 * Parses a rupee amount typed by a person into paise.
 * Accepts "500", "500.5", "1,250.75", "₹ 1,250". Returns null if invalid.
 * Uses string arithmetic so 0.1 + 0.2 style float errors cannot happen.
 */
export function parseRupeesToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise)) return null;
  return paise;
}
