"use client";

import { useState } from "react";

/** Centered confirmation for destructive actions. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-text/55 px-6" onClick={(e) => (e.stopPropagation(), onCancel())}>
      <div role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-5">
        <h3 className="text-xl font-bold text-text">{title}</h3>
        {body && <p className="mt-2 text-base text-ink-soft">{body}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} autoFocus className="h-12 rounded-xl border-2 border-rule text-lg font-semibold text-ink-soft">
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            className={`h-12 rounded-xl text-lg font-semibold text-white disabled:opacity-60 ${danger ? "bg-over" : "bg-ink"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
