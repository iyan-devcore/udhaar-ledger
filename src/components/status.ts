import type { CustomerStatus } from "@/lib/balance";
import { formatDayMonth } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { fill, type Dict } from "@/lib/i18n";

/** Colours per status. Only status uses red / amber / green. */
export const statusStyles: Record<CustomerStatus, { bar: string; text: string; chip: string }> = {
  overdue: { bar: "bg-over", text: "text-over", chip: "bg-over-bg text-over" },
  soon: { bar: "bg-soon", text: "text-soon", chip: "bg-soon-bg text-soon" },
  paid: { bar: "bg-paid", text: "text-paid", chip: "bg-paid-bg text-paid" },
  advance: { bar: "bg-paid", text: "text-paid", chip: "bg-paid-bg text-paid" },
  normal: { bar: "bg-transparent", text: "text-text", chip: "bg-paper text-ink-soft" },
};

/** One short line describing where the customer stands. */
export function statusLine(
  c: { status: CustomerStatus; overdue: number; nextDue: string; daysToDue: number; balance: number },
  t: Dict,
  lang: string,
): string {
  switch (c.status) {
    case "paid":
      return t.paidUp;
    case "advance":
      return `${t.advance} ${formatPaise(-c.balance)}`;
    case "overdue":
      return fill(t.overdueAmount, { amount: formatPaise(c.overdue) });
    default:
      if (c.daysToDue === 0) return t.dueToday;
      if (c.daysToDue === 1) return t.dueTomorrow;
      if (c.daysToDue <= 7) return fill(t.dueInDays, { n: c.daysToDue });
      return fill(t.dueOn, { date: formatDayMonth(c.nextDue, lang) });
  }
}
