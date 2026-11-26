"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dict, Lang } from "@/lib/i18n";

const I18nContext = createContext<{ lang: Lang; t: Dict } | null>(null);

/** Makes the current dictionary available to client components. */
export function I18nProvider({ lang, t, children }: { lang: Lang; t: Dict; children: ReactNode }) {
  return <I18nContext value={{ lang, t }}>{children}</I18nContext>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
