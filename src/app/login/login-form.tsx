"use client";

import { useActionState } from "react";
import { fill } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-base font-medium text-ink-soft">{t.password}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="h-14 rounded-xl border-2 border-rule bg-card px-4 text-xl focus:border-ink focus:outline-none"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-over-bg px-4 py-3 font-medium text-over">
          {state.error === "locked" ? fill(t.tooManyTries, { minutes: state.minutes ?? 15 }) : t.wrongPassword}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-xl bg-ink text-xl font-semibold text-white active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? t.loading : t.loginButton}
      </button>
    </form>
  );
}
