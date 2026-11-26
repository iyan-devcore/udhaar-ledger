"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  backupNow,
  importOpeningCsv,
  restoreFromJson,
  saveShopSettings,
  type SimpleState,
} from "@/app/actions/settings";
import { setLanguage } from "@/app/actions/lang";
import { LANGS, fill, getDict, type DictKey } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { ConfirmDialog } from "./confirm-dialog";
import { IconUpload } from "./icons";

const inputCls = "h-13 w-full rounded-xl border-2 border-rule bg-card px-4 text-lg focus:border-ink focus:outline-none";

function Notice({ state, okText }: { state: SimpleState; okText?: string }) {
  const { t } = useI18n();
  if (state.ok) return <p role="status" className="rounded-lg bg-paid-bg px-3 py-2 text-base font-semibold text-paid">{okText ?? t.saved}</p>;
  if (!state.error) return null;
  return (
    <div role="alert" className="rounded-lg bg-over-bg px-3 py-2 text-base text-over">
      <p className="font-semibold">{state.message ?? (state.error in t ? t[state.error as DictKey] : t.errorGeneric)}</p>
      {state.rowErrors && (
        <ul className="mt-1 list-disc pl-5 text-sm">
          {state.rowErrors.map((e) => (
            <li key={e.row}>
              Row {e.row}: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ShopSettingsForm({ shopName, upiId, templates }: { shopName: string; upiId: string; templates: Record<string, string> }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<SimpleState, FormData>(saveShopSettings, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-base font-semibold text-ink-soft">{t.shopName}</span>
        <input name="shopName" defaultValue={shopName} maxLength={80} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-base font-semibold text-ink-soft">{t.upiId}</span>
        <input name="upiId" defaultValue={upiId} maxLength={100} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="shopname@okaxis" className={inputCls} />
        <span className="text-sm text-muted">{t.upiIdHelp}</span>
      </label>

      <div className="mt-2">
        <p className="text-base font-semibold text-ink-soft">{t.templates}</p>
        <p className="text-sm text-muted">{t.templatesHelp}</p>
      </div>
      {LANGS.map((lang) => (
        <label key={lang} className="flex flex-col gap-1.5">
          <span className="text-base text-ink-soft">{fill(t.templateFor, { lang: getDict(lang).langName })}</span>
          <textarea
            name={`template_${lang}`}
            defaultValue={templates[lang] ?? ""}
            rows={5}
            maxLength={1000}
            lang={lang}
            className="w-full rounded-xl border-2 border-rule bg-card px-4 py-3 text-base leading-relaxed focus:border-ink focus:outline-none"
          />
        </label>
      ))}
      <Notice state={state} />
      <button type="submit" disabled={pending} className="h-13 rounded-xl bg-ink text-lg font-semibold text-white disabled:opacity-60">
        {pending ? t.loading : t.save}
      </button>
    </form>
  );
}

export function LanguagePicker() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={t.appLanguage}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={lang === l}
          onClick={() =>
            start(async () => {
              await setLanguage(l);
              router.refresh();
            })
          }
          className={`h-12 rounded-xl border-2 text-lg font-semibold ${lang === l ? "border-ink bg-ink text-white" : "border-rule bg-card text-ink-soft"}`}
        >
          {getDict(l).langName}
        </button>
      ))}
    </div>
  );
}

export function BackupNowButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<SimpleState>({});
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setState(await backupNow());
            router.refresh();
          })
        }
        className="h-13 rounded-xl bg-ink text-lg font-semibold text-white disabled:opacity-60"
      >
        {pending ? t.loading : t.backupNow}
      </button>
      <Notice state={state} okText={t.backupDone} />
    </div>
  );
}

function FileForm({
  action,
  accept,
  label,
  help,
  confirm,
  okText,
}: {
  action: (prev: SimpleState, fd: FormData) => Promise<SimpleState>;
  accept: string;
  label: string;
  help: string;
  confirm?: string;
  okText: (state: SimpleState) => string;
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<SimpleState, FormData>(action, {});
  const [fileName, setFileName] = useState("");
  const [asking, setAsking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 rounded-xl border border-rule bg-paper p-3">
      <p className="text-base font-semibold text-text">{label}</p>
      <p className="text-sm text-muted">{help}</p>
      <label className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-ink/30 bg-card px-3 text-base text-ink">
        <IconUpload size={20} />
        <span className="truncate">{fileName || t.chooseFile}</span>
        <input
          type="file"
          name="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
      </label>
      <Notice state={state} okText={state.ok ? okText(state) : undefined} />
      <button
        type={confirm ? "button" : "submit"}
        disabled={pending || !fileName}
        onClick={confirm ? () => setAsking(true) : undefined}
        className="h-12 rounded-xl border-2 border-ink bg-card text-lg font-semibold text-ink disabled:opacity-40"
      >
        {pending ? t.loading : t.upload}
      </button>
      {asking && confirm && (
        <ConfirmDialog
          title={confirm}
          body={t.restoreWarning}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          danger
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            formRef.current?.requestSubmit();
          }}
        />
      )}
    </form>
  );
}

export function RestoreJsonForm() {
  const { t } = useI18n();
  return (
    <FileForm
      action={restoreFromJson}
      accept="application/json,.json"
      label={t.restoreJson}
      help={t.restoreWarning}
      confirm={t.restoreConfirm}
      okText={(s) => {
        const n = JSON.parse(s.message ?? "{}") as { customers?: number; entries?: number };
        return fill(t.restoreDone, { customers: n.customers ?? 0, entries: n.entries ?? 0 });
      }}
    />
  );
}

export function ImportCsvForm() {
  const { t } = useI18n();
  return (
    <FileForm
      action={importOpeningCsv}
      accept="text/csv,.csv"
      label={t.importCsv}
      help={t.importCsvHelp}
      okText={(s) => fill(t.importDone, { n: s.message ?? "0" })}
    />
  );
}
