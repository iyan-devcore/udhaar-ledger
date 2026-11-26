import Link from "next/link";
import { requirePageAuth } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { fill } from "@/lib/i18n";
import { formatPaise } from "@/lib/money";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";
import { LangToggle } from "@/components/lang-toggle";
import { CustomerList, type CustomerRow } from "@/components/customer-list";
import { IconPlus } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requirePageAuth();
  const { t } = await getT();
  const r = repo();
  const summaries = r.listCustomerSummaries(today());
  const total = r.totalOutstanding();
  const owing = summaries.filter((c) => c.balance > 0).length;

  const rows: CustomerRow[] = summaries.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    balance: c.balance,
    overdue: c.overdue,
    nextDue: c.nextDue,
    daysToDue: c.daysToDue,
    status: c.status,
  }));

  return (
    <main>
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-bold text-ink">{t.appName}</h1>
        <LangToggle />
      </header>

      <section className="mx-4 mt-3 rounded-2xl bg-ink px-5 py-4 text-white">
        <p className="text-base text-white/75">{t.totalOutstanding}</p>
        <p className="num mt-0.5 text-[2.6rem] leading-tight font-extrabold">{formatPaise(total)}</p>
        <p className="text-base text-white/75">{fill(t.fromCustomers, { n: owing })}</p>
      </section>

      <CustomerList customers={rows} />
      <div className="h-20" aria-hidden />

      <Link
        href="/customers/new"
        aria-label={t.addCustomer}
        className="no-print fixed right-4 z-20 flex h-16 items-center gap-2 rounded-full bg-ink pr-6 pl-5 text-lg font-semibold text-white shadow-lg shadow-ink/30 active:scale-95"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <IconPlus size={26} strokeWidth={2.6} />
        {t.addCustomer}
      </Link>
    </main>
  );
}
