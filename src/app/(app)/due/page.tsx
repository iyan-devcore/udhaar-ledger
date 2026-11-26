import Link from "next/link";
import { requirePageAuth } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { fill } from "@/lib/i18n";
import { formatPaise } from "@/lib/money";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";
import { env } from "@/lib/env";
import { ReminderButton } from "@/components/reminder-button";
import { statusLine, statusStyles } from "@/components/status";

export const dynamic = "force-dynamic";

/** "Remind all due soon": overdue first, then due within 7 days, one Remind button each. */
export default async function DuePage() {
  await requirePageAuth();
  const { t, lang } = await getT();
  const r = repo();
  const day = today();
  const list = r
    .listCustomerSummaries(day)
    .filter((c) => c.status === "overdue" || c.status === "soon")
    .sort((a, b) => (a.status === b.status ? a.daysToDue - b.daysToDue || b.balance - a.balance : a.status === "overdue" ? -1 : 1));
  const last = r.lastReminderByCustomer();
  const total = list.reduce((s, c) => s + c.balance, 0);

  const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: env.timeZone }).format(new Date(iso));
  const when = (iso: string) => {
    const d = dayOf(iso);
    if (d === day) return t.today.toLowerCase();
    return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: env.timeZone, day: "numeric", month: "short" }).format(new Date(iso));
  };

  return (
    <main>
      <header className="px-4 pt-4">
        <h1 className="text-xl font-bold text-ink">{t.dueTitle}</h1>
        <p className="text-base text-muted">{t.dueSubtitle}</p>
      </header>

      {list.length === 0 ? (
        <div className="mx-4 mt-6 rounded-2xl border-2 border-dashed border-rule bg-card px-6 py-10 text-center">
          <p className="text-lg font-semibold text-paid">{t.nothingDue}</p>
        </div>
      ) : (
        <>
          <p className="mx-4 mt-3 flex items-baseline justify-between rounded-xl bg-card px-4 py-3">
            <span className="text-base text-muted">{fill(t.fromCustomers, { n: list.length })}</span>
            <span className="num text-2xl font-extrabold text-text">{formatPaise(total)}</span>
          </p>
          <ul className="mx-4 mt-3 overflow-hidden rounded-2xl border border-rule bg-card">
            {list.map((c) => {
              const s = statusStyles[c.status];
              const lastAt = last.get(c.id);
              const remindedToday = lastAt ? dayOf(lastAt) === day : false;
              return (
                <li key={c.id} className="relative flex items-center gap-3 border-b border-rule py-3 pr-3 pl-5 last:border-b-0">
                  <span className={`absolute top-2 bottom-2 left-0 w-1.5 rounded-r ${s.bar}`} aria-hidden />
                  <Link href={`/customers/${c.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold text-text">{c.name}</span>
                    <span className="num block text-lg font-bold text-text">{formatPaise(c.balance)}</span>
                    <span className={`block text-sm ${s.text}`}>{statusLine(c, t, lang)}</span>
                    {lastAt && <span className="block text-sm text-muted">{fill(t.reminded, { when: when(lastAt) })}</span>}
                  </Link>
                  <div className="w-32 shrink-0">
                    {c.phone ? (
                      <ReminderButton customerId={c.id} done={remindedToday} />
                    ) : (
                      <span className="block text-center text-sm text-muted">{t.noPhone}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
