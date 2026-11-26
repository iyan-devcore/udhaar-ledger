"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EntryType } from "@/lib/balance";
import { formatDayMonth } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { deleteEntry, restoreEntry } from "@/app/actions/entries";
import { useI18n } from "./i18n-provider";
import { IconArrowDown, IconArrowUp } from "./icons";
import { EntrySheet, type SheetMode } from "./entry-sheet";

export type LedgerEntry = {
  id: number;
  type: EntryType;
  amount: number;
  note: string;
  entryDate: string;
  edited: boolean;
  runningBalance: number;
};

const UNDO_MS = 10_000;

/** Customer page body: the two big buttons, the history and the entry sheet. */
export function CustomerLedger({
  customerId,
  balance,
  creditLimit,
  today,
  entries,
}: {
  customerId: number;
  balance: number;
  creditLimit: number | null;
  today: string;
  entries: LedgerEntry[];
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [toast, setToast] = useState<{ text: string; undoId?: number } | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, undoId?: number) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, undoId });
    timer.current = setTimeout(() => setToast(null), undoId ? UNDO_MS : 2500);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onDelete = async (id: number) => {
    const res = await deleteEntry(id);
    setSheet(null);
    if (res.ok) {
      showToast(t.deleted, id);
      startTransition(() => router.refresh());
    } else showToast(t.errorGeneric);
  };

  const onUndo = async (id: number) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
    const res = await restoreEntry(id);
    if (res.ok) startTransition(() => router.refresh());
    else showToast(t.errorGeneric);
  };

  // Newest first for reading; running balance was computed oldest first.
  const history = [...entries].reverse();

  return (
    <>
      <div className="no-print mx-4 mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSheet({ kind: "new", type: "credit" })}
          className="flex h-20 flex-col items-center justify-center rounded-2xl bg-ink text-lg leading-tight font-bold text-white shadow-md shadow-ink/20 active:scale-[0.98]"
        >
          <IconArrowUp size={26} strokeWidth={2.6} />
          {t.gaveCredit}
        </button>
        <button
          type="button"
          onClick={() => setSheet({ kind: "new", type: "payment" })}
          className="flex h-20 flex-col items-center justify-center rounded-2xl bg-paid text-lg leading-tight font-bold text-white shadow-md shadow-paid/20 active:scale-[0.98]"
        >
          <IconArrowDown size={26} strokeWidth={2.6} />
          {t.receivedPayment}
        </button>
      </div>

      <section className="mt-6">
        <h2 className="px-4 pb-2 text-lg font-bold text-ink">{t.history}</h2>
        {history.length === 0 ? (
          <p className="mx-4 rounded-2xl border-2 border-dashed border-rule px-4 py-8 text-center text-lg text-muted">{t.noEntries}</p>
        ) : (
          <ul className="mx-4 overflow-hidden rounded-2xl border border-rule bg-card">
            {history.map((e) => (
              <li key={e.id} className="border-b border-rule last:border-b-0">
                <button
                  type="button"
                  onClick={() => setSheet({ kind: "edit", entry: e })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-paper"
                  aria-label={`${t.editEntry}: ${e.type === "credit" ? t.credit : t.payment} ${formatPaise(e.amount)}`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${e.type === "credit" ? "bg-ink/10 text-ink" : "bg-paid-bg text-paid"}`}
                    aria-hidden
                  >
                    {e.type === "credit" ? <IconArrowUp size={20} /> : <IconArrowDown size={20} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-text">
                      {e.note || (e.type === "credit" ? t.credit : t.payment)}
                    </span>
                    <span className="block text-sm text-muted">
                      {formatDayMonth(e.entryDate, lang, today)}
                      {e.edited && <span className="ml-2 italic">· {t.edited}</span>}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className={`num block text-lg font-bold ${e.type === "credit" ? "text-text" : "text-paid"}`}>
                      {e.type === "credit" ? "+" : "−"}
                      {formatPaise(e.amount)}
                    </span>
                    <span className="num block text-sm text-muted">{formatPaise(e.runningBalance)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sheet && (
        <EntrySheet
          key={sheet.kind === "edit" ? `e${sheet.entry.id}` : sheet.type}
          mode={sheet}
          customerId={customerId}
          balance={balance}
          creditLimit={creditLimit}
          today={today}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            showToast(t.saved);
            startTransition(() => router.refresh());
          }}
          onDelete={onDelete}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-text px-4 py-3 text-base text-white shadow-xl"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          <span>{toast.text}</span>
          {toast.undoId && (
            <button type="button" onClick={() => onUndo(toast.undoId!)} className="h-10 rounded-lg px-3 text-base font-bold text-[#9fb4ff]">
              {t.undo}
            </button>
          )}
        </div>
      )}
    </>
  );
}
