"use client";

import * as React from "react";
import { useActionState } from "react";

import { Panel } from "@/components/admin/ui";
import { Field, Input, Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveSettings, type ActionState } from "@/modules/admin/actions";

type Setting = { key: string; value: string | boolean; group: string; label: string | null };

const initialState: ActionState = { status: "idle" };

const GROUP_TITLES: Record<string, { title: string; description: string }> = {
  general: { title: "عمومی", description: "نام و شعار سایت که در هدر، فوتر و عنوان صفحات دیده می‌شود." },
  contact: { title: "اطلاعات تماس", description: "این اطلاعات در فوتر، صفحه تماس و داده‌های ساختاریافته سئو استفاده می‌شود." },
  orders: { title: "سفارش‌ها", description: "رفتار سیستم هنگام دریافت درخواست جدید." },
  features: { title: "قابلیت‌ها", description: "فعال یا غیرفعال کردن ماژول‌ها. سبد استعلام و پرداخت آنلاین برای فاز بعدی آماده شده‌اند." },
  seo: { title: "سئو", description: "عنوان و توضیحات پیش‌فرض برای صفحاتی که مقدار اختصاصی ندارند." },
};

export function SettingsForm({ settings }: { settings: Setting[] }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(saveSettings, initialState);

  React.useEffect(() => {
    if (state.status === "idle") return;
    toast({
      title: state.status === "success" ? "ذخیره شد" : "خطا",
      description: state.message,
      tone: state.status === "success" ? "success" : "error",
    });
  }, [state, toast]);

  const groups = Array.from(new Set(settings.map((s) => s.group)));
  const booleanKeys = settings.filter((s) => typeof s.value === "boolean").map((s) => s.key);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="__booleanKeys" value={booleanKeys.join(",")} />

      {groups.map((group) => {
        const meta = GROUP_TITLES[group] ?? { title: group, description: "" };
        const items = settings.filter((s) => s.group === group);

        return (
          <Panel key={group} title={meta.title}>
            {meta.description && (
              <p className="mb-5 text-xs leading-6 text-[var(--fg-muted)]">{meta.description}</p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {items.map((setting) =>
                typeof setting.value === "boolean" ? (
                  <div key={setting.key} className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev-2)] p-4 sm:col-span-2">
                    <Switch
                      name={`setting:${setting.key}`}
                      defaultChecked={setting.value}
                      label={setting.label ?? setting.key}
                      hint={setting.key}
                    />
                  </div>
                ) : (
                  <Field key={setting.key} label={setting.label ?? setting.key} htmlFor={setting.key} hint={setting.key}>
                    <Input id={setting.key} name={`setting:${setting.key}`} defaultValue={String(setting.value)} />
                  </Field>
                ),
              )}
            </div>
          </Panel>
        );
      })}

      <div className="sticky bottom-0 flex justify-end border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] py-4 backdrop-blur-xl">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)] disabled:opacity-60"
        >
          {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </button>
      </div>
    </form>
  );
}
