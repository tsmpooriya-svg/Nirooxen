"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";

import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { DialogTrigger, type TriggerConfig } from "@/components/admin/dialog-trigger";
import { useToast } from "@/components/ui/toast";
import { deleteProject, saveProject, type ActionState } from "@/modules/admin/actions";

const initialState: ActionState = { status: "idle" };

export type ProjectValues = {
  id?: string;
  title: string;
  slug: string;
  client: string;
  location: string;
  year: string;
  capacity: string;
  summary: string;
  description: string;
  coverUrl: string;
  tags: string;
  position: string;
  isActive: boolean;
  isFeatured: boolean;
};

/**
 * فرم پروژه.
 *
 * تا پیش از این هیچ رابطی برای پروژه‌ها وجود نداشت؛ جدول `projects` ساخته
 * شده بود اما فقط با اسکریپت seed پر می‌شد. بعد از حذف پروژه‌های ساختگی در
 * فاز ۱، عملاً هیچ راهی برای افزودن پروژه واقعی جز SQL نبود.
 *
 * الگوی مودال + useActionState دقیقاً همان چیزی است که دسته‌بندی و برند
 * استفاده می‌کنند تا رفتار پنل یکدست بماند.
 */
export function ProjectDialog({
  values,
  trigger,
}: {
  values: ProjectValues;
  trigger: TriggerConfig;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const action = saveProject.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);

  // بستن مودال پس از ذخیره موفق — در زمان رندر، نه داخل effect
  const [lastState, setLastState] = React.useState(state);
  if (lastState !== state) {
    setLastState(state);
    if (state.status === "success") setOpen(false);
  }

  React.useEffect(() => {
    if (state.status === "idle") return;
    toast({
      title: state.status === "success" ? "ذخیره شد" : "خطا",
      description: state.message,
      tone: state.status === "success" ? "success" : "error",
    });
  }, [state, toast]);

  return (
    <>
      <DialogTrigger config={trigger} onOpen={() => setOpen(true)} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={values.id ? `ویرایش «${values.title}»` : "پروژه جدید"}
        size="lg"
      >
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="عنوان پروژه"
              htmlFor="prj-title"
              required
              error={state.errors?.title}
              className="sm:col-span-2"
            >
              <Input id="prj-title" name="title" defaultValue={values.title} required />
            </Field>

            <Field label="نامک (slug)" htmlFor="prj-slug" hint="خالی = ساخت خودکار از عنوان">
              <Input
                id="prj-slug"
                name="slug"
                defaultValue={values.slug}
                dir="ltr"
                className="text-start font-mono text-xs"
              />
            </Field>

            <Field label="کارفرما" htmlFor="prj-client" hint="فقط در صورت داشتن اجازه انتشار نام">
              <Input id="prj-client" name="client" defaultValue={values.client} />
            </Field>

            <Field label="موقعیت" htmlFor="prj-location">
              <Input id="prj-location" name="location" defaultValue={values.location} />
            </Field>

            <Field label="سال اجرا" htmlFor="prj-year" hint="مثلاً ۱۴۰۳">
              <Input id="prj-year" name="year" defaultValue={values.year} />
            </Field>

            <Field label="ظرفیت" htmlFor="prj-capacity" hint="مثلاً ۴۵ متر مکعب بر ساعت">
              <Input id="prj-capacity" name="capacity" defaultValue={values.capacity} />
            </Field>

            <Field label="ترتیب نمایش" htmlFor="prj-position">
              <Input
                id="prj-position"
                name="position"
                defaultValue={values.position}
                dir="ltr"
                inputMode="numeric"
                className="text-start font-mono"
              />
            </Field>

            <Field label="خلاصه" htmlFor="prj-summary" className="sm:col-span-2">
              <Textarea id="prj-summary" name="summary" rows={2} defaultValue={values.summary} />
            </Field>

            <Field label="شرح کامل" htmlFor="prj-description" className="sm:col-span-2">
              <Textarea id="prj-description" name="description" rows={5} defaultValue={values.description} />
            </Field>

            <Field label="تصویر شاخص" htmlFor="prj-cover" hint="مسیر تصویر، مثل /images/products/booster-set.svg">
              <Input
                id="prj-cover"
                name="coverUrl"
                defaultValue={values.coverUrl}
                dir="ltr"
                className="text-start font-mono text-xs"
              />
            </Field>

            <Field label="برچسب‌ها" htmlFor="prj-tags" hint="با ویرگول جدا کنید">
              <Input id="prj-tags" name="tags" defaultValue={values.tags} />
            </Field>

            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <Checkbox name="isActive" label="فعال" defaultChecked={values.isActive} />
              <Checkbox name="isFeatured" label="نمایش در صفحه اصلی" defaultChecked={values.isFeatured} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-hairline)] pt-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-md border border-[var(--border-subtle)] px-4 text-sm text-[var(--fg-secondary)] transition-colors hover:border-[var(--border-default)]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-60"
            >
              {pending ? "در حال ذخیره…" : "ذخیره پروژه"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await deleteProject(id);
      toast({
        title: result.status === "success" ? "حذف شد" : "خطا",
        description: result.message,
        tone: result.status === "success" ? "success" : "error",
      });
      if (result.status === "success") setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`حذف ${title}`}
        className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger-text)]"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={pending}
        title={`حذف «${title}»؟`}
        description="این پروژه از سایت حذف می‌شود. این عمل قابل بازگشت نیست."
        confirmLabel="حذف پروژه"
        tone="danger"
      />
    </>
  );
}
