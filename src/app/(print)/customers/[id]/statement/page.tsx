import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAuth } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { formatDayMonth, formatYearMonth, isValidYearMonth, monthRange, shiftYearMonth } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";
import { IconBack } from "@/components/icons";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

const WIDE = "hidden sm:table-cell print:table-cell";
const NARROW = "sm:hidden print:hidden";

/** Printable monthly statement. Use the browser's Print → Save as PDF. */
export default async function StatementPage({ params, searchParams }: PageProps<"/customers/[id]/statement">) {
  await requirePageAuth();
  const id = Number((await params).id);
  const r = repo();
  const c = Number.isInteger(id) && id > 0 ? r.getCustomer(id) : undefined;
  if (!c) notFound();

  const day = today();
  const currentMonth = day.slice(0, 7);
  const mParam = (await searchParams).m;
  const month = typeof mParam === "string" && isValidYearMonth(mParam) ? mParam : currentMonth;
  const { start, end } = monthRange(month);
  const st = r.statement(c.id, start, end);
  const settings = r.getSettings();
  const { t, lang } = await getT();
  const months = Array.from(new Set([currentMonth, ...r.entryMonths(c.id)])).sort().reverse();

  const prev = shiftYearMonth(month, -1);
  const next = shiftYearMonth(month, 1);

  return (
    <main className="mx-auto max-w-3xl bg-card print:max-w-none">
      <div className="no-print sticky top-0 z-10 flex items-center gap-2 border-b border-rule bg-card px-2 py-2">
        <Link href={`/customers/${c.id}`} aria-label={t.back} className="grid h-12 w-12 place-items-center rounded-full text-ink active:bg-rule/50">
          <IconBack size={28} />
        </Link>
        <div className="flex flex-1 items-center justify-center gap-1">
          <Link href={`?m=${prev}`} aria-label="Previous month" className="grid h-11 w-11 place-items-center rounded-full text-2xl text-ink active:bg-rule/50">
            ‹
          </Link>
          <form className="contents">
            <label className="sr-only" htmlFor="m">
              {t.month}
            </label>
            <select
              id="m"
              name="m"
              defaultValue={month}
              className="h-11 rounded-lg border-2 border-rule bg-card px-2 text-base font-semibold text-ink"
              // Changing the month reloads the page with ?m=
              data-autosubmit
            >
              {(months.includes(month) ? months : [month, ...months]).map((m) => (
                <option key={m} value={m}>
                  {formatYearMonth(m, lang)}
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit">OK</button>
            </noscript>
          </form>
          {month < currentMonth ? (
            <Link href={`?m=${next}`} aria-label="Next month" className="grid h-11 w-11 place-items-center rounded-full text-2xl text-ink active:bg-rule/50">
              ›
            </Link>
          ) : (
            <span className="h-11 w-11" />
          )}
        </div>
        <PrintButton label={t.print} />
      </div>

      <article className="px-4 py-5 sm:px-5 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <p className="text-xl font-bold text-ink sm:text-2xl">{settings.shopName || t.appName}</p>
            <p className="mt-1 text-base text-muted">
              {t.statementTitle}, {formatYearMonth(month, lang)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{c.name}</p>
            {c.phone && <p className="num text-base text-muted">{formatPhone(c.phone)}</p>}
          </div>
        </header>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          {[
            [t.openingBal, st.opening, ""],
            [t.totalCredit, st.totalCredit, ""],
            [t.totalPaid, st.totalPaid, "text-paid"],
            [t.closingBal, st.closing, "text-ink"],
          ].map(([label, value, cls]) => (
            <div key={label as string} className="rounded-xl border border-rule px-3 py-2">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className={`num text-xl font-bold ${cls}`}>{formatPaise(value as number)}</dd>
            </div>
          ))}
        </dl>

        {/* Phones get one signed amount column; wider screens and print get credit and payment columns. */}
        <table className="mt-6 w-full border-collapse text-base">
          <thead>
            <tr className="border-b-2 border-ink text-left text-sm text-ink-soft">
              <th className="py-2 pr-2 font-semibold">{t.date}</th>
              <th className="py-2 pr-2 font-semibold">{t.details}</th>
              <th className={`py-2 pr-2 text-right font-semibold ${WIDE}`}>{t.credit}</th>
              <th className={`py-2 pr-2 text-right font-semibold ${WIDE}`}>{t.payment}</th>
              <th className={`py-2 pr-2 text-right font-semibold ${NARROW}`}>{t.amount}</th>
              <th className="py-2 text-right font-semibold">{t.balance}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule text-muted">
              <td className="py-2 pr-2 whitespace-nowrap">{formatDayMonth(start, lang)}</td>
              <td className="py-2 pr-2">{t.openingBal}</td>
              <td className={WIDE} />
              <td className={WIDE} />
              <td className={NARROW} />
              <td className="num py-2 text-right whitespace-nowrap">{formatPaise(st.opening)}</td>
            </tr>
            {st.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted">
                  {t.noEntriesMonth}
                </td>
              </tr>
            ) : (
              st.lines.map((e) => (
                <tr key={e.id} className="border-b border-rule align-top break-inside-avoid">
                  <td className="py-2 pr-2 whitespace-nowrap">{formatDayMonth(e.entryDate, lang)}</td>
                  <td className="py-2 pr-2 break-words">{e.note}</td>
                  <td className={`num py-2 pr-2 text-right ${WIDE}`}>{e.type === "credit" ? formatPaise(e.amount, { symbol: false }) : ""}</td>
                  <td className={`num py-2 pr-2 text-right text-paid ${WIDE}`}>{e.type === "payment" ? formatPaise(e.amount, { symbol: false }) : ""}</td>
                  <td className={`num py-2 pr-2 text-right whitespace-nowrap ${e.type === "payment" ? "text-paid" : ""} ${NARROW}`}>
                    {e.type === "credit" ? "+" : "−"}
                    {formatPaise(e.amount, { symbol: false })}
                  </td>
                  <td className="num py-2 text-right whitespace-nowrap">{formatPaise(e.runningBalance)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink font-bold">
              <td className="py-2 pr-2" colSpan={2}>
                {t.closingBal}
              </td>
              <td className={`num py-2 pr-2 text-right ${WIDE}`}>{formatPaise(st.totalCredit, { symbol: false })}</td>
              <td className={`num py-2 pr-2 text-right text-paid ${WIDE}`}>{formatPaise(st.totalPaid, { symbol: false })}</td>
              <td className={NARROW} />
              <td className="num py-2 text-right whitespace-nowrap text-ink">{formatPaise(st.closing)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 text-sm text-muted">
          {t.printedOn} {formatDayMonth(day, lang, "0000-01-01")}
        </p>
      </article>
    </main>
  );
}
