"use client";

import { useState } from "react";
import { IconCopy } from "./icons";

export function CopyButton({ text, label, doneLabel }: { text: string; label: string; doneLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Older browsers: select-and-copy fallback
          const el = document.createElement("textarea");
          el.value = text;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          el.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className="flex h-11 shrink-0 items-center gap-2 rounded-lg border-2 border-ink/20 px-3 text-base font-semibold text-ink"
    >
      <IconCopy size={18} />
      {done ? doneLabel : label}
    </button>
  );
}
