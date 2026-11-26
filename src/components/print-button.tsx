"use client";

import { useEffect } from "react";
import { IconPrinter } from "./icons";

/** Opens the print dialog (where "Save as PDF" lives) and wires the month picker. */
export function PrintButton({ label }: { label: string }) {
  useEffect(() => {
    const select = document.querySelector<HTMLSelectElement>("select[data-autosubmit]");
    const onChange = () => select?.form?.requestSubmit();
    select?.addEventListener("change", onChange);
    return () => select?.removeEventListener("change", onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-11 items-center gap-2 rounded-xl bg-ink px-3 text-base font-semibold text-white"
    >
      <IconPrinter size={20} />
      <span className="hidden min-[400px]:inline">{label}</span>
      <span className="sr-only min-[400px]:hidden">{label}</span>
    </button>
  );
}
