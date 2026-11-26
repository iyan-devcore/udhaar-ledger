"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerStatus } from "@/lib/balance";
import { formatPaise } from "@/lib/money";
import { useI18n } from "./i18n-provider";
import { IconSearch, IconX } from "./icons";
import { statusLine, statusStyles } from "./status";

export type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  balance: number;
  overdue: number;
  nextDue: string;
  daysToDue: number;
  status: CustomerStatus;
};

type Filter = "all" | "due7" | "overdue";
type Sort = "balance" | "due";

export function CustomerList({ customers }: { customers: CustomerRow[] }) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("balance");

  const counts = useMemo(
    () => ({
      due7: customers.filter((c) => c.status === "soon").length,
      overdue: customers.filter((c) => c.status === "overdue").length,
    }),
    [customers],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const list = customers.filter((c) => {
      if (filter === "due7" && c.status !== "soon") return false;
      if (filter === "overdue" && c.status !== "overdue") return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (qDigits.length >= 3 && c.phone.includes(qDigits));
    });
    return list.sort((a, b) => {
      if (sort === "balance") return b.balance - a.balance || a.name.localeCompare(b.name);
      // Next due: overdue first, then soonest due date; paid-up customers last.
      const rank = (c: CustomerRow) => (c.status === "overdue" ? 0 : c.balance > 0 ? 1 : 2);
      return rank(a) - rank(b) || a.daysToDue - b.daysToDue || b.balance - a.balance;
    });
  }, [customers, query, filter, sort]);

  if (customers.length === 0) {
    return (
      <div className="mx-4 mt-8 rounded-2xl border-2 border-dashed border-rule bg-card px-6 py-10 text-center">
        <p className="text-xl font-semibold text-ink">{t.noCustomers}</p>
        <p className="mx-auto mt-2 max-w-xs text-base text-muted">{t.addFirstCustomer}</p>
      </div>
    );
  }

  const chip = (value: Filter, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`h-11 shrink-0 rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap ${
        filter === value ? "border-ink bg-ink text-white" : "border-rule bg-card text-ink-soft"
      }`}
    >
      {label}
      {count ? <span className="num ml-1.5 opacity-80">{count}</span> : null}
    </button>
  );

  return (
    <section className="mt-4">
      <div className="sticky top-0 z-10 bg-paper/95 px-4 pt-1 pb-3 backdrop-blur">
        <label className="relative block">
          <span className="sr-only">{t.search}</span>
          <IconSearch className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="h-13 w-full rounded-xl border-2 border-rule bg-card pr-12 pl-12 text-lg focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t.close}
              className="absolute top-1/2 right-1 grid h-11 w-11 -translate-y-1/2 place-items-center text-muted"
            >
              <IconX />
            </button>
          )}
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {chip("all", t.filterAll)}
          {chip("overdue", t.filterOverdue, counts.overdue)}
          {chip("due7", t.filterDue7, counts.due7)}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <span className="num text-base text-muted">{visible.length}</span>
        <div role="group" className="flex rounded-lg bg-rule/50 p-1">
          {(["balance", "due"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`h-9 rounded-md px-3 text-sm font-semibold ${sort === s ? "bg-card text-ink shadow-sm" : "text-ink-soft"}`}
            >
              {s === "balance" ? t.sortBalance : t.sortDue}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-lg text-muted">{t.noMatches}</p>
      ) : (
        <ul className="mx-4 overflow-hidden rounded-2xl border border-rule bg-card">
          {visible.map((c) => {
            const s = statusStyles[c.status];
            return (
              <li key={c.id} className="border-b border-rule last:border-b-0">
                <Link href={`/customers/${c.id}`} className="relative flex min-h-[4.5rem] items-center gap-3 py-3 pr-4 pl-5 active:bg-paper">
                  <span className={`absolute top-2 bottom-2 left-0 w-1.5 rounded-r ${s.bar}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold text-text">{c.name}</span>
                    <span className={`block text-base ${c.status === "normal" ? "text-muted" : s.text}`}>{statusLine(c, t, lang)}</span>
                  </span>
                  <span className={`num text-[1.35rem] font-bold ${c.balance > 0 ? "text-text" : s.text}`}>
                    {formatPaise(Math.max(c.balance, 0))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
