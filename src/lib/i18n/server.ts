import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, getDict, isLang, type Lang } from "./index";

/** Current UI language from the "lang" cookie. */
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: getDict(lang) };
}
