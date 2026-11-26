import { daysBetween, lastPassedDueDate, nextDueDate, type ISODate } from "./dates";

/**
 * Balance rules (pure functions, used by the repository and tested directly).
 * Balance = credits - payments, ignoring deleted entries. Never stored.
 */

export type EntryType = "credit" | "payment";

export type BalanceEntry = {
  type: EntryType;
  amount: number; // paise
  entryDate: ISODate;
  deletedAt?: string | null;
};

const live = (e: BalanceEntry) => !e.deletedAt;

export function computeBalance(entries: BalanceEntry[]): number {
  return entries.filter(live).reduce((sum, e) => sum + (e.type === "credit" ? e.amount : -e.amount), 0);
}

/**
 * Running balance after each entry. Entries must already be in date order.
 */
export function withRunningBalance<T extends BalanceEntry>(entries: T[]): Array<T & { runningBalance: number }> {
  let running = 0;
  return entries.filter(live).map((e) => {
    running += e.type === "credit" ? e.amount : -e.amount;
    return { ...e, runningBalance: running };
  });
}

/**
 * Overdue amount: credit taken on or before the last passed due date that has
 * not yet been paid off. Payments pay off the oldest credit first, so anything
 * bought after the due date is not counted as overdue.
 */
export function computeOverdue(creditsUpToLastDue: number, totalPayments: number, balance: number): number {
  return Math.max(0, Math.min(creditsUpToLastDue - totalPayments, balance));
}

export type CustomerStatus = "overdue" | "soon" | "paid" | "advance" | "normal";

export const DUE_SOON_DAYS = 7;

export function customerStatus(balance: number, overdue: number, daysToDue: number): CustomerStatus {
  if (balance < 0) return "advance";
  if (balance === 0) return "paid";
  if (overdue > 0) return "overdue";
  if (daysToDue <= DUE_SOON_DAYS) return "soon";
  return "normal";
}

/** Due-date facts for one customer on a given day. */
export function dueInfo(dueDay: number, today: ISODate) {
  const nextDue = nextDueDate(dueDay, today);
  return {
    nextDue,
    lastPassedDue: lastPassedDueDate(dueDay, today),
    daysToDue: daysBetween(today, nextDue),
  };
}
