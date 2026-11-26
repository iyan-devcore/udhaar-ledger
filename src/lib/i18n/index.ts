import { en, type Dict, type DictKey } from "./en";
import { hi } from "./hi";

/** Registered languages. Add new dictionary files here. */
export const dictionaries = { en, hi } satisfies Record<string, Dict>;

export type Lang = keyof typeof dictionaries;
export const LANGS = Object.keys(dictionaries) as Lang[];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "lang";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && value in dictionaries;
}

export function getDict(lang: Lang): Dict {
  return dictionaries[lang] ?? en;
}

/** Replaces {placeholders} in a string. Unknown placeholders are left as is. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export type { Dict, DictKey };
