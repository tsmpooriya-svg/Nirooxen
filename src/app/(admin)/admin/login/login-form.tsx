"use client";

import { useActionState, useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { login, type LoginState } from "@/modules/auth/actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Field label="ایمیل" htmlFor="email" required error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="username"
          placeholder="admin@example.com"
          className="text-start"
          required
          autoFocus
          invalid={Boolean(state.errors?.email)}
        />
      </Field>

      <Field label="رمز عبور" htmlFor="password" required error={state.errors?.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
            className="text-start pe-11"
            required
            invalid={Boolean(state.errors?.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
            className="absolute inset-y-0 end-0 grid w-11 place-items-center text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
          >
            {showPassword ? (
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l14 14M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5" strokeLinecap="round" />
                <path d="M6.3 6.4C4.4 7.5 3 9.2 2.5 10c1.2 2.2 4.1 5 7.5 5 1.2 0 2.3-.3 3.3-.9M16 12.6c.7-.8 1.2-1.7 1.5-2.6-1.2-2.2-4.1-5-7.5-5-.5 0-1 .05-1.5.15" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2.5 10C3.7 7.8 6.6 5 10 5s6.3 2.8 7.5 5c-1.2 2.2-4.1 5-7.5 5s-6.3-2.8-7.5-5Z" />
                <circle cx="10" cy="10" r="2.5" />
              </svg>
            )}
          </button>
        </div>
      </Field>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)] p-3 text-meta leading-6 text-[var(--danger-text)]"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--brand)] text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)] disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="anim-spin size-4 rounded-full border-2 border-current border-t-transparent" aria-hidden />
            در حال ورود…
          </>
        ) : (
          "ورود به پنل"
        )}
      </button>
    </form>
  );
}
