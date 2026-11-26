"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, checkPassword, clientKey, endSession, startSession } from "@/lib/auth/guard";
import { clearLoginFailures, loginRetryAfter, recordLoginFailure } from "@/lib/auth/rate-limit";

export type LoginState = { error?: "wrong" | "locked"; minutes?: number };

const schema = z.object({ password: z.string().min(1).max(200) });

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  await assertSameOrigin();
  const key = await clientKey();

  const wait = loginRetryAfter(key);
  if (wait > 0) return { error: "locked", minutes: Math.ceil(wait / 60) };

  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    recordLoginFailure(key);
    const after = loginRetryAfter(key);
    if (after > 0) return { error: "locked", minutes: Math.ceil(after / 60) };
    return { error: "wrong" };
  }

  clearLoginFailures(key);
  await startSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await assertSameOrigin();
  await endSession();
  redirect("/login");
}
