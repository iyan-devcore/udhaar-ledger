"use client";

import { useI18n } from "./i18n-provider";
import { IconMessage } from "./icons";

/** Placeholder until reminders are built. */
export function ReminderButton({ disabled }: { customerId: number; disabled?: boolean; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <button type="button" disabled className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-rule bg-card text-base font-semibold text-ink disabled:opacity-40" aria-disabled={disabled}>
      <IconMessage size={20} /> {t.remind}
    </button>
  );
}
