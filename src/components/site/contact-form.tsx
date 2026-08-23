"use client";

import { useActionState } from "react";

import { Field, Input, Textarea } from "@/components/ui/field";
import { sendContactMessage, type ContactActionState } from "@/modules/orders/contact-action";

const initialState: ContactActionState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);

  if (state.status === "success") {
    return (
      <div className="anim-pop flex flex-col items-center rounded-xl border border-[color-mix(in_oklab,var(--ok)_40%,transparent)] bg-[var(--ok-soft)] p-10 text-center">
        <span className="mb-5 grid size-14 place-items-center rounded-full border border-[color-mix(in_oklab,var(--ok)_45%,transparent)] bg-[var(--bg-elev-1)]">
          <svg viewBox="0 0 24 24" className="size-7 text-[var(--ok)]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h3 className="font-display text-base font-bold">پیام شما دریافت شد</h3>
        <p className="mt-3 max-w-sm text-[0.8125rem] leading-8 text-[var(--fg-secondary)]">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="absolute -left-[9999px] top-0" aria-hidden>
        <label htmlFor="contact-hp">وب‌سایت</label>
        <input id="contact-hp" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی" htmlFor="name" required error={state.errors?.name}>
          <Input id="name" name="name" autoComplete="name" required invalid={Boolean(state.errors?.name)} />
        </Field>

        <Field label="شماره تماس" htmlFor="phone" required error={state.errors?.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09121234567"
            className="text-start font-mono"
            required
            invalid={Boolean(state.errors?.phone)}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="ایمیل" htmlFor="email" error={state.errors?.email} hint="اختیاری">
          <Input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            className="text-start"
            invalid={Boolean(state.errors?.email)}
          />
        </Field>

        <Field label="موضوع" htmlFor="subject" hint="اختیاری">
          <Input id="subject" name="subject" placeholder="مثلاً: درخواست مشاوره فنی" />
        </Field>
      </div>

      <Field label="متن پیام" htmlFor="message" required error={state.errors?.message}>
        <Textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder="شرایط پروژه یا سؤال فنی خود را بنویسید…"
          invalid={Boolean(state.errors?.message)}
        />
      </Field>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)] p-3.5 text-[0.8125rem] text-[var(--danger)]"
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
            در حال ارسال…
          </>
        ) : (
          "ارسال پیام"
        )}
      </button>
    </form>
  );
}
