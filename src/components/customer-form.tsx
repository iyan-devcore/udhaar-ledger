"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveCustomer, type CustomerFormState } from "@/app/actions/customers";
import { LANGS, getDict } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";

export type CustomerFormDefaults = {
  id?: number;
  name: string;
  phone: string;
  dueDay: string;
  creditLimit: string;
  notes: string;
  language: string;
  isActive: boolean;
};

const inputCls =
  "h-14 w-full rounded-xl border-2 border-rule bg-card px-4 text-lg focus:border-ink focus:outline-none aria-[invalid=true]:border-over";

export function CustomerForm({ defaults, cancelHref }: { defaults: CustomerFormDefaults; cancelHref: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(saveCustomer, {});
  const v = { ...defaults, ...state.values };
  const err = state.errors ?? {};
  const isNew = !defaults.id;

  const field = (
    name: keyof CustomerFormDefaults | "openingBalance",
    label: string,
    input: React.ReactNode,
    help?: string,
  ) => {
    const e = err[name as keyof typeof err];
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-base font-semibold text-ink-soft">{label}</span>
        {input}
        {e ? (
          <span role="alert" className="text-base font-medium text-over">
            {t[e]}
          </span>
        ) : help ? (
          <span className="text-sm text-muted">{help}</span>
        ) : null}
      </label>
    );
  };

  return (
    <form action={action} className="flex flex-col gap-5 px-4 pb-8">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      {field(
        "name",
        t.name,
        <input name="name" defaultValue={v.name} required maxLength={80} autoComplete="off" aria-invalid={!!err.name} className={inputCls} autoFocus={isNew} />,
      )}

      {field(
        "phone",
        t.phone,
        <div className="flex">
          <span className="grid h-14 place-items-center rounded-l-xl border-2 border-r-0 border-rule bg-paper px-3 text-lg text-muted">+91</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={v.phone}
            maxLength={20}
            autoComplete="off"
            aria-invalid={!!err.phone}
            className={`${inputCls} rounded-l-none`}
            placeholder="98765 43210"
          />
        </div>,
      )}

      <div className="grid grid-cols-2 gap-3">
        {field(
          "dueDay",
          t.dueDay,
          <input name="dueDay" type="number" inputMode="numeric" min={1} max={31} required defaultValue={v.dueDay} aria-invalid={!!err.dueDay} className={`${inputCls} num`} />,
        )}
        {field(
          "creditLimit",
          `${t.creditLimit} (${t.optional})`,
          <input name="creditLimit" inputMode="decimal" defaultValue={v.creditLimit} placeholder="₹" aria-invalid={!!err.creditLimit} className={`${inputCls} num`} />,
        )}
      </div>
      <p className="-mt-3 text-sm text-muted">{t.dueDayHelp}</p>

      {isNew &&
        field(
          "openingBalance",
          `${t.openingBalance} (${t.optional})`,
          <input
            name="openingBalance"
            inputMode="decimal"
            defaultValue={(state.values as Record<string, string> | undefined)?.openingBalance ?? ""}
            placeholder="₹"
            aria-invalid={!!err.openingBalance}
            className={`${inputCls} num`}
          />,
          t.openingBalanceHelp,
        )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-base font-semibold text-ink-soft">{t.reminderLanguage}</legend>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map((l) => (
            <label key={l} className="relative">
              <input type="radio" name="language" value={l} defaultChecked={v.language === l} className="peer sr-only" />
              <span className="flex h-12 items-center justify-center rounded-xl border-2 border-rule bg-card text-lg font-semibold text-ink-soft peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-ink">
                {getDict(l).langName}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {field("notes", `${t.notes} (${t.optional})`, <textarea name="notes" defaultValue={v.notes} rows={2} maxLength={500} className={`${inputCls} h-auto py-3`} />)}

      {!isNew && (
        <label className="flex min-h-12 items-center gap-3 text-lg">
          <input type="checkbox" name="hidden" defaultChecked={!defaults.isActive} className="h-6 w-6 accent-ink" />
          {t.hideCustomer}
        </label>
      )}

      <div className="mt-2 grid grid-cols-[1fr_2fr] gap-3">
        <Link href={cancelHref} className="flex h-14 items-center justify-center rounded-xl border-2 border-rule text-lg font-semibold text-ink-soft">
          {t.cancel}
        </Link>
        <button type="submit" disabled={pending} className="h-14 rounded-xl bg-ink text-lg font-semibold text-white disabled:opacity-60">
          {pending ? t.loading : t.save}
        </button>
      </div>
    </form>
  );
}
