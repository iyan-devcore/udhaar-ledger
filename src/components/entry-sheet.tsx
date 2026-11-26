"use client";

import { useEffect, useRef, useState } from "react";
import type { EntryType } from "@/lib/balance";
import { formatPaise, parseRupeesToPaise, paiseToDecimal, MAX_AMOUNT_PAISE } from "@/lib/money";
import { fill } from "@/lib/i18n";
import { addEntry, updateEntry } from "@/app/actions/entries";
import { useI18n } from "./i18n-provider";
import { IconBackspace, IconX } from "./icons";
import { ConfirmDialog } from "./confirm-dialog";
import type { LedgerEntry } from "./customer-ledger";

export type SheetMode = { kind: "new"; type: EntryType } | { kind: "edit"; entry: LedgerEntry };

/** Keeps typed amounts to digits with at most one dot and two decimals. */
function cleanAmount(next: string): string | null {
  if (next === "") return "";
  if (!/^\d*\.?\d{0,2}$/.test(next)) return null;
  if (next.replace(".", "").length > 9) return null; // ₹99,99,999.99 max typing
  return next.replace(/^0+(?=\d)/, "");
}

const effect = (type: EntryType, amount: number) => (type === "credit" ? amount : -amount);

/**
 * Bottom sheet for adding or editing one entry. Built for speed at the
 * counter: the amount is focused on open, a big keypad is always on screen,
 * the date defaults to today and Save is one tap away.
 */
export function EntrySheet({
  mode,
  customerId,
  balance,
  creditLimit,
  today,
  onClose,
  onSaved,
  onDelete,
}: {
  mode: SheetMode;
  customerId: number;
  balance: number;
  creditLimit: number | null;
  today: string;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const { t } = useI18n();
  const editing = mode.kind === "edit" ? mode.entry : null;

  const [type, setType] = useState<EntryType>(editing ? editing.type : mode.kind === "new" ? mode.type : "credit");
  const initialAmount = editing
    ? paiseToDecimal(editing.amount).replace(/\.00$/, "")
    : mode.kind === "new" && mode.type === "payment" && balance > 0
      ? paiseToDecimal(balance).replace(/\.00$/, "")
      : "";
  const [amount, setAmount] = useState(initialAmount);
  // A prefilled amount is replaced by the first key press instead of appended to.
  const [replaceNext, setReplaceNext] = useState(initialAmount !== "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [date, setDate] = useState(editing?.entryDate ?? today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const paise = parseRupeesToPaise(amount) ?? 0;
  const base = editing ? balance - effect(editing.type, editing.amount) : balance;
  const newBalance = base + effect(type, paise);
  const overLimit = type === "credit" && creditLimit !== null && creditLimit > 0 && newBalance > creditLimit;

  const press = (key: string) => {
    setError(null);
    if (key === "back") {
      setReplaceNext(false);
      setAmount((a) => (replaceNext ? "" : a.slice(0, -1)));
      return;
    }
    const start = replaceNext ? "" : amount;
    const next = cleanAmount(start === "" && key === "." ? "0." : start + key);
    if (next !== null) {
      setAmount(next);
      setReplaceNext(false);
    }
  };

  const save = async () => {
    if (saving) return;
    if (paise <= 0 || paise > MAX_AMOUNT_PAISE) {
      setError(t.enterAmount);
      amountRef.current?.focus();
      return;
    }
    setSaving(true);
    const payload = { type, amount: paise, note: note.trim(), entryDate: date || today };
    const res = editing ? await updateEntry({ id: editing.id, ...payload }) : await addEntry({ customerId, ...payload });
    setSaving(false);
    if (res.ok) onSaved();
    else setError(res.error in t ? t[res.error as keyof typeof t] : t.errorGeneric);
  };

  const accent = type === "credit" ? "bg-ink" : "bg-paid";
  const title = editing ? t.editEntry : type === "credit" ? t.gaveCredit : t.receivedPayment;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-text/45" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter flex max-h-[96dvh] w-full max-w-xl flex-col overflow-y-auto rounded-t-3xl bg-card px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${type === "credit" ? "text-ink" : "text-paid"}`}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="grid h-11 w-11 place-items-center rounded-full text-muted active:bg-paper">
            <IconX />
          </button>
        </div>

        {editing && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-paper p-1">
            {(["credit", "payment"] as const).map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => setType(ty)}
                aria-pressed={type === ty}
                className={`h-10 rounded-lg text-base font-semibold ${type === ty ? `${ty === "credit" ? "bg-ink" : "bg-paid"} text-white` : "text-ink-soft"}`}
              >
                {ty === "credit" ? t.credit : t.payment}
              </button>
            ))}
          </div>
        )}

        <label className="mt-2 block">
          <span className="sr-only">{t.amount}</span>
          <div className={`flex items-center rounded-2xl border-2 px-4 ${error ? "border-over" : "border-ink/25"} focus-within:border-ink`}>
            <span className="text-4xl font-bold text-muted">₹</span>
            <input
              ref={amountRef}
              value={amount}
              inputMode="none"
              autoComplete="off"
              placeholder="0"
              onChange={(e) => {
                const next = cleanAmount(e.target.value.replace(/,/g, ""));
                if (next !== null) {
                  setAmount(next);
                  setReplaceNext(false);
                  setError(null);
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="num h-[4.25rem] w-full min-w-0 bg-transparent pl-2 text-[2.75rem] font-extrabold text-text caret-ink outline-none placeholder:text-rule"
            />
          </div>
        </label>
        {error && (
          <p role="alert" className="mt-1 text-base font-medium text-over">
            {error}
          </p>
        )}

        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            maxLength={200}
            placeholder={`${t.note}: ${t.notePlaceholder}`}
            aria-label={t.note}
            className="h-12 min-w-0 rounded-xl border-2 border-rule px-3 text-base focus:border-ink focus:outline-none"
          />
          <label className="relative flex h-12 items-center rounded-xl border-2 border-rule px-3 text-base font-semibold text-ink focus-within:border-ink">
            <span aria-hidden>{date === today ? t.today : date.split("-").reverse().join("/")}</span>
            <input
              type="date"
              value={date}
              max="2100-12-31"
              onChange={(e) => setDate(e.target.value || today)}
              aria-label={t.date}
              className="absolute inset-0 opacity-0"
            />
          </label>
        </div>

        <div className="mt-2 flex min-h-7 items-center justify-between text-base">
          <span className="text-muted">{t.newBalance}</span>
          <span className={`num font-bold ${overLimit ? "text-over" : "text-text"}`}>{formatPaise(newBalance)}</span>
        </div>
        {overLimit && (
          <p role="status" className="mt-1 rounded-lg bg-soon-bg px-3 py-2 text-base font-semibold text-soon">
            {fill(t.overLimit, { limit: formatPaise(creditLimit!) })}
          </p>
        )}

        <div className="mt-2 grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              // Keep focus (and the caret) in the amount field while tapping keys.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => press(k)}
              aria-label={k === "back" ? "Backspace" : k}
              className="num grid h-[3.4rem] place-items-center rounded-xl bg-paper text-[1.7rem] font-semibold text-text active:bg-rule"
            >
              {k === "back" ? <IconBackspace size={28} /> : k}
            </button>
          ))}
        </div>

        <div className={`mt-3 grid gap-2 ${editing ? "grid-cols-[auto_1fr]" : ""}`}>
          {editing && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="h-14 rounded-xl border-2 border-over/40 px-5 text-lg font-semibold text-over"
            >
              {t.deleteEntry}
            </button>
          )}
          <button type="button" onClick={save} disabled={saving} className={`h-14 rounded-xl text-xl font-bold text-white disabled:opacity-60 ${accent}`}>
            {saving ? t.loading : `${t.save}${paise > 0 ? ` ${formatPaise(paise)}` : ""}`}
          </button>
        </div>
      </div>

      {confirmDelete && editing && (
        <ConfirmDialog
          title={t.confirmDeleteEntry}
          body={`${editing.type === "credit" ? t.credit : t.payment} ${formatPaise(editing.amount)}${editing.note ? ` · ${editing.note}` : ""}`}
          confirmLabel={t.yesDelete}
          cancelLabel={t.cancel}
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => onDelete(editing.id)}
        />
      )}
    </div>
  );
}
