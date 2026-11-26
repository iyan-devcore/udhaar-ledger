"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/lib/auth/guard";
import { LANG_COOKIE, isLang } from "@/lib/i18n";

/** Switches the UI language (stored in a cookie, so it works before login too). */
export async function setLanguage(lang: string): Promise<void> {
  await assertSameOrigin();
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/", "layout");
}
