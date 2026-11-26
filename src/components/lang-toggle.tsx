"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLanguage } from "@/app/actions/lang";
import { useI18n } from "./i18n-provider";

/** Small pill that flips between English and Hindi. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = lang === "hi" ? "en" : "hi";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLanguage(next);
          router.refresh();
        })
      }
      className={`min-h-11 min-w-14 rounded-full border-2 border-ink/20 px-3 text-base font-semibold text-ink disabled:opacity-50 ${className}`}
      aria-label={next === "hi" ? "हिंदी में बदलें" : "Switch to English"}
    >
      {next === "hi" ? "हिंदी" : "English"}
    </button>
  );
}
