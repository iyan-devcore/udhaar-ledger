"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { remindCustomer } from "@/app/actions/reminders";
import type { DictKey } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { IconMessage } from "./icons";

/**
 * Prepares the reminder on the server (pay link + message + log entry), then
 * opens WhatsApp with the message filled in. The shop owner presses Send.
 */
export function ReminderButton({
  customerId,
  disabled,
  compact,
  done,
}: {
  customerId: number;
  disabled?: boolean;
  compact?: boolean;
  done?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    const res = await remindCustomer(customerId);
    setBusy(false);
    if (!res.ok) {
      setError(t[res.error as DictKey] ?? t.errorGeneric);
      return;
    }
    router.refresh();
    if (res.url) window.location.href = res.url;
  };

  const base = compact
    ? "h-12 rounded-xl border-2 text-base"
    : "h-12 min-w-28 rounded-xl px-4 text-base";
  const look = done
    ? "border-2 border-paid/40 bg-paid-bg text-paid"
    : compact
      ? "border-rule bg-card text-ink"
      : "bg-[#1f8f4e] text-white";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={go}
        disabled={disabled || busy}
        className={`flex w-full items-center justify-center gap-2 font-semibold disabled:opacity-40 ${base} ${look}`}
      >
        {done ? <span aria-hidden className="text-lg leading-none">✓</span> : <IconMessage size={20} />}
        {busy ? t.openingWhatsApp : t.remind}
      </button>
      {error && (
        <p role="alert" className="absolute top-full right-0 z-10 mt-1 rounded-lg bg-over px-2 py-1 text-sm whitespace-nowrap text-white">
          {error}
        </p>
      )}
    </div>
  );
}
