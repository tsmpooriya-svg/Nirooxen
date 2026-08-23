"use client";

import * as React from "react";
import { useActionState } from "react";

import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { USER_ROLE } from "@/lib/constants";
import { saveUser, type ActionState } from "@/modules/admin/actions";

export type UserValues = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
};

const initialState: ActionState = { status: "idle" };

export function UserDialog({
  values,
  trigger,
}: {
  values: UserValues;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const action = saveUser.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);

  React.useEffect(() => {
    if (state.status === "idle") return;
    toast({
      title: state.status === "success" ? "ذخیره شد" : "خطا",
      description: state.message,
      tone: state.status === "success" ? "success" : "error",
    });
    if (state.status === "success") setOpen(false);
  }, [state, toast]);

  return (
    <>
      {trigger(() => setOpen(true))}

      <Modal open={open} onClose={() => setOpen(false)} title={values.id ? `ویرایش «${values.name}»` : "کاربر جدید"} size="sm">
        <form action={formAction} className="space-y-5">
          <Field label="نام و نام خانوادگی" htmlFor="user-name" required error={state.errors?.name}>
            <Input id="user-name" name="name" defaultValue={values.name} required />
          </Field>

          <Field label="ایمیل" htmlFor="user-email" required error={state.errors?.email}>
            <Input id="user-email" name="email" type="email" dir="ltr" className="text-start" defaultValue={values.email} required />
          </Field>

          <Field label="شماره تماس" htmlFor="user-phone">
            <Input id="user-phone" name="phone" dir="ltr" className="text-start font-mono" defaultValue={values.phone} />
          </Field>

          <Field label="سطح دسترسی" htmlFor="user-role">
            <Select id="user-role" name="role" defaultValue={values.role}>
              {Object.entries(USER_ROLE).map(([key, entry]) => (
                <option key={key} value={key}>{entry.label} — {entry.description}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="رمز عبور"
            htmlFor="user-password"
            error={state.errors?.password}
            hint={values.id ? "برای تغییر ندادن رمز، خالی بگذارید. تغییر رمز همه نشست‌های کاربر را می‌بندد." : "حداقل ۸ کاراکتر"}
          >
            <Input id="user-password" name="password" type="password" dir="ltr" className="text-start" autoComplete="new-password" />
          </Field>

          <Checkbox name="isActive" defaultChecked={values.isActive} label="حساب فعال است" />

          {state.status === "error" && state.message && (
            <p className="rounded-md border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)]">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md border border-[var(--border-default)] px-4 text-sm hover:bg-[var(--bg-elev-3)]">
              انصراف
            </button>
            <button type="submit" disabled={pending} className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50">
              {pending ? "در حال ذخیره…" : "ذخیره"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
