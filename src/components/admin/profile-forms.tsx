"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  changePassword,
  revokeOtherSessions,
  revokeSession,
  updateProfile,
  type ProfileState,
} from "@/modules/auth/profile-actions";

const initial: ProfileState = { status: "idle" };

/** پیام نتیجه را یک بار و فقط هنگام تغییر نشان می‌دهد */
function useResultToast(state: ProfileState) {
  const { toast } = useToast();
  React.useEffect(() => {
    if (state.status === "idle") return;
    toast({
      title: state.status === "success" ? "انجام شد" : "انجام نشد",
      description: state.message,
      tone: state.status === "success" ? "success" : "error",
    });
  }, [state, toast]);
}

/* -------------------------------------------------------------------------- */

export function ProfileDetailsForm({ name, phone }: { name: string; phone: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, initial);
  useResultToast(state);

  return (
    <form action={formAction} className="space-y-5">
      <Field label="نام و نام خانوادگی" htmlFor="name" required error={state.errors?.name}>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          invalid={Boolean(state.errors?.name)}
        />
      </Field>

      <Field
        label="شمارهٔ تماس"
        htmlFor="phone"
        hint="اختیاری — برای هماهنگی داخلی تیم"
        error={state.errors?.phone}
      >
        <Input
          id="phone"
          name="phone"
          defaultValue={phone}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09121234567"
          className="text-start"
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "در حال ذخیره…" : "ذخیرهٔ تغییرات"}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initial);
  useResultToast(state);

  /*
    فرم پس از موفقیت پاک می‌شود. بدون این، سه رمز در فیلدها می‌مانند و دفعهٔ
    بعد که کسی صفحه را باز می‌کند رمز تازه هنوز آنجاست.
  */
  const ref = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-5">
      <Field label="رمز فعلی" htmlFor="currentPassword" required error={state.errors?.currentPassword}>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          className="text-start"
          required
          invalid={Boolean(state.errors?.currentPassword)}
        />
      </Field>

      <Field
        label="رمز تازه"
        htmlFor="newPassword"
        hint="دست‌کم ۸ نویسه"
        required
        error={state.errors?.newPassword}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          className="text-start"
          required
          invalid={Boolean(state.errors?.newPassword)}
        />
      </Field>

      <Field label="تکرار رمز تازه" htmlFor="confirmPassword" required error={state.errors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          className="text-start"
          required
          invalid={Boolean(state.errors?.confirmPassword)}
        />
      </Field>

      <p className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-4 py-3 text-micro leading-6 text-[var(--fg-muted)]">
        با عوض شدن رمز، همهٔ دستگاه‌های دیگر از حساب بیرون می‌روند. همین دستگاه باز می‌ماند.
      </p>

      <Button type="submit" disabled={pending}>
        {pending ? "در حال تغییر…" : "تغییر رمز عبور"}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const { toast } = useToast();
  const [pending, start] = React.useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await revokeSession(sessionId);
          toast({
            title: result.status === "success" ? "بسته شد" : "انجام نشد",
            description: result.message,
            tone: result.status === "success" ? "success" : "error",
          });
        })
      }
    >
      {pending ? "…" : "بستن"}
    </Button>
  );
}

export function RevokeOthersButton({ count }: { count: number }) {
  const { toast } = useToast();
  const [pending, start] = React.useTransition();

  if (count === 0) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await revokeOtherSessions();
          toast({
            title: result.status === "success" ? "انجام شد" : "انجام نشد",
            description: result.message,
            tone: result.status === "success" ? "success" : "error",
          });
        })
      }
    >
      {pending ? "…" : "خروج از بقیهٔ دستگاه‌ها"}
    </Button>
  );
}
