import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAuth } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { formatDayMonth } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";
import { PageHeader } from "@/components/page-header";
import { statusLine, statusStyles } from "@/components/status";
import { CustomerLedger } from "@/components/customer-ledger";
import { ReminderButton } from "@/components/reminder-button";
import { IconFile, IconPencil, IconPhone } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  await requirePageAuth();
  const id = Number((await params).id);
  const day = today();
  const r = repo();
  const c = Number.isInteger(id) && id > 0 ? r.getCustomerSummary(id, day) : undefined;
  if (!c) notFound();
  const { t, lang } = await getT();
  const entries = r.listEntries(c.id);
  const s = statusStyles[c.status];
  const limitPct = c.creditLimit ? Math.round((Math.max(c.balance, 0) / c.creditLimit) * 100) : null;

  return (
    <main>
      <PageHeader
        title={c.name}
        backHref="/"
        backLabel={t.back}
        right={
          <Link href={`/customers/${c.id}/edit`} aria-label={t.editCustomer} className="grid h-12 w-12 place-items-center rounded-full text-ink active:bg-rule/50">
            <IconPencil />
          </Link>
        }
      />

      <section className="mx-4 rounded-2xl border border-rule bg-card px-5 pt-4 pb-5">
        <p className="text-base text-muted">{t.balance}</p>
        <p className={`num text-[3.25rem] leading-none font-extrabold ${c.balance > 0 ? (c.status === "overdue" ? "text-over" : "text-text") : s.text}`}>
          {formatPaise(Math.max(c.balance, 0))}
        </p>
        <p className={`mt-2 inline-block rounded-full px-3 py-1 text-base font-semibold ${s.chip}`}>{statusLine(c, t, lang)}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-rule pt-4 text-base">
          <div>
            <dt className="text-muted">{t.nextDue}</dt>
            <dd className="font-semibold">{formatDayMonth(c.nextDue, lang, day)}</dd>
          </div>
          {c.creditLimit ? (
            <div>
              <dt className="text-muted">{t.limitUsed}</dt>
              <dd className="font-semibold">
                <span className="num">{formatPaise(Math.max(c.balance, 0))}</span>
                <span className="text-muted"> / </span>
                <span className="num">{formatPaise(c.creditLimit)}</span>
              </dd>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-rule" aria-hidden>
                <div
                  className={`h-full rounded-full ${limitPct! >= 100 ? "bg-over" : limitPct! >= 80 ? "bg-soon" : "bg-ink"}`}
                  style={{ width: `${Math.min(limitPct!, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            c.phone && (
              <div>
                <dt className="text-muted">{t.phone}</dt>
                <dd className="num font-semibold">{formatPhone(c.phone)}</dd>
              </div>
            )
          )}
        </dl>
        {c.notes && <p className="mt-3 text-base text-ink-soft">{c.notes}</p>}
      </section>

      <div className="no-print mx-4 mt-3 grid grid-cols-3 gap-2">
        {c.phone ? (
          <a href={`tel:${c.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-rule bg-card text-base font-semibold text-ink">
            <IconPhone size={20} /> {t.call}
          </a>
        ) : (
          <span className="flex h-12 items-center justify-center rounded-xl border-2 border-dashed border-rule text-sm text-muted">{t.noPhone}</span>
        )}
        <ReminderButton customerId={c.id} disabled={!c.phone || c.balance <= 0} compact />
        <Link
          href={`/customers/${c.id}/statement`}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-rule bg-card text-base font-semibold text-ink"
        >
          <IconFile size={20} /> {t.statement}
        </Link>
      </div>

      <CustomerLedger
        customerId={c.id}
        balance={c.balance}
        creditLimit={c.creditLimit}
        today={day}
        entries={entries.map((e) => ({
          id: e.id,
          type: e.type,
          amount: e.amount,
          note: e.note,
          entryDate: e.entryDate,
          edited: !!e.editedAt,
          runningBalance: e.runningBalance,
        }))}
      />
      {!c.isActive && <p className="mx-4 mt-4 text-center text-base text-muted">{t.customerHidden}</p>}
    </main>
  );
}
