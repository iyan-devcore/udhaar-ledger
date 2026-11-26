/**
 * Date helpers. Ledger dates are plain calendar days stored as "YYYY-MM-DD"
 * strings, so there are no time zone surprises once a date is chosen.
 * "Today" is computed in the shop's time zone (Asia/Kolkata by default).
 */

export type ISODate = string; // "YYYY-MM-DD"

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(year: number, month: number, day: number): ISODate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseISODate(iso: ISODate): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseISODate(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Today's date in the given time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** month is 1-12 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The due date for a given month. A due day that does not exist in that month
 * (31 in a 30 day month, 29-31 in February) falls on the month's last day.
 */
export function dueDateInMonth(year: number, month: number, dueDay: number): ISODate {
  return toISODate(year, month, Math.min(dueDay, daysInMonth(year, month)));
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** The next due date on or after today. */
export function nextDueDate(dueDay: number, today: ISODate): ISODate {
  const { year, month } = parseISODate(today);
  const thisMonth = dueDateInMonth(year, month, dueDay);
  if (thisMonth >= today) return thisMonth;
  const next = shiftMonth(year, month, 1);
  return dueDateInMonth(next.year, next.month, dueDay);
}

/** The most recent due date strictly before today (the one that may now be overdue). */
export function lastPassedDueDate(dueDay: number, today: ISODate): ISODate {
  const { year, month } = parseISODate(today);
  const thisMonth = dueDateInMonth(year, month, dueDay);
  if (thisMonth < today) return thisMonth;
  const prev = shiftMonth(year, month, -1);
  return dueDateInMonth(prev.year, prev.month, dueDay);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
  return Math.round((Date.UTC(db.year, db.month - 1, db.day) - Date.UTC(da.year, da.month - 1, da.day)) / 86_400_000);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const { year, month, day } = parseISODate(iso);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return toISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** "2026-11" -> first and last day of that month. */
export function monthRange(ym: string): { start: ISODate; end: ISODate } {
  const [year, month] = ym.split("-").map(Number);
  return { start: toISODate(year, month, 1), end: toISODate(year, month, daysInMonth(year, month)) };
}

export function isValidYearMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function shiftYearMonth(ym: string, delta: number): string {
  const [year, month] = ym.split("-").map(Number);
  const s = shiftMonth(year, month, delta);
  return `${s.year}-${pad(s.month)}`;
}

const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: ["जन", "फ़र", "मार्च", "अप्रै", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"],
};
const MONTHS_LONG: Record<string, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
};

/** "2026-11-05" -> "5 Nov" (adds the year when it differs from `today`'s year). */
export function formatDayMonth(iso: ISODate, lang = "en", today?: ISODate): string {
  const { year, month, day } = parseISODate(iso);
  const names = MONTHS[lang] ?? MONTHS.en;
  const showYear = today ? parseISODate(today).year !== year : false;
  return `${day} ${names[month - 1]}${showYear ? ` ${year}` : ""}`;
}

/** "2026-11" -> "November 2026" */
export function formatYearMonth(ym: string, lang = "en"): string {
  const [year, month] = ym.split("-").map(Number);
  return `${(MONTHS_LONG[lang] ?? MONTHS_LONG.en)[month - 1]} ${year}`;
}
