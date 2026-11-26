/**
 * Phone numbers are stored in E.164 form, defaulting to India (+91).
 */

/**
 * Normalises what a person types into "+91XXXXXXXXXX".
 * Accepts "98765 43210", "098765-43210", "+91 98765 43210", "919876543210".
 * Numbers that already start with "+" and another country code are kept.
 * Returns null when the input is not a usable mobile number. Empty input returns "".
 */
export function normalizePhone(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (raw === "") return "";
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (hasPlus && !digits.startsWith("91")) {
    // Another country: keep as given if the length is plausible.
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** Digits only, as wa.me expects: "+919876543210" -> "919876543210". */
export function phoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** "+919876543210" -> "98765 43210" for display. */
export function formatPhone(phone: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return m ? `${m[1]} ${m[2]}` : phone;
}
