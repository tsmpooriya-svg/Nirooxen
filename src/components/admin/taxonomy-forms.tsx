"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { DialogTrigger, type TriggerConfig } from "@/components/admin/dialog-trigger";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useReadOnly } from "./shell";
import { useToast } from "@/components/ui/toast";
import { toFaDigits } from "@/lib/utils";
import { domainIcons } from "@/components/ui/icons";
import { deleteBrand, deleteCategory, saveBrand, saveCategory, type ActionState } from "@/modules/admin/actions";

const initialState: ActionState = { status: "idle" };

/* -------------------------------------------------------------------------- */
/*  دسته‌بندی                                                                   */
/* -------------------------------------------------------------------------- */

export type CategoryValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string;
  position: string;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
};

export function CategoryDialog({
  values,
  parents,
  trigger,
}: {
  values: CategoryValues;
  parents: { id: string; name: string }[];
  trigger: TriggerConfig;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const action = saveCategory.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);

  // بستن مودال پس از ذخیره موفق — در زمان رندر، نه داخل effect
  const [lastState, setLastState] = React.useState(state);
  if (lastState !== state) {
    setLastState(state);
    if (state.status === "success") setOpen(false);
  }

  // نمایش نوتیفیکیشن، همگام‌سازی با یک سیستم بیرونی است و جای درستش effect است
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
        title={values.id ? `ویرایش «${values.name}»` : "دسته‌بندی جدید"}
        size="md"
      >
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="نام دسته‌بندی" htmlFor="cat-name" required error={state.errors?.name} className="sm:col-span-2">
              <Input id="cat-name" name="name" defaultValue={values.name} required />
            </Field>

            <Field label="نامک (slug)" htmlFor="cat-slug" hint="خالی = ساخت خودکار">
              <Input id="cat-slug" name="slug" defaultValue={values.slug} dir="ltr" className="text-start font-mono text-xs" />
            </Field>

            <Field label="دسته والد" htmlFor="cat-parent">
              <Select id="cat-parent" name="parentId" defaultValue={values.parentId}>
                <option value="">— دسته اصلی —</option>
                {parents
                  .filter((p) => p.id !== values.id)
                  .map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="آیکون" htmlFor="cat-icon">
              <Select id="cat-icon" name="icon" defaultValue={values.icon}>
                <option value="">— بدون آیکون —</option>
                {Object.keys(domainIcons).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="ترتیب نمایش" htmlFor="cat-position">
              <Input id="cat-position" name="position" defaultValue={values.position} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <Field label="توضیحات" htmlFor="cat-desc" className="sm:col-span-2">
              <Textarea id="cat-desc" name="description" rows={3} defaultValue={values.description} />
            </Field>

            <Field label="عنوان متا" htmlFor="cat-meta-title">
              <Input id="cat-meta-title" name="metaTitle" defaultValue={values.metaTitle} />
            </Field>

            <Field label="توضیحات متا" htmlFor="cat-meta-desc">
              <Input id="cat-meta-desc" name="metaDescription" defaultValue={values.metaDescription} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-6 border-t border-[var(--border-hairline)] pt-4">
            <Checkbox name="isActive" defaultChecked={values.isActive} label="فعال" />
            <Checkbox name="isFeatured" defaultChecked={values.isFeatured} label="نمایش در صفحه اصلی" />
          </div>

          {state.status === "error" && state.message && (
            <p className="rounded-md border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger-text)]">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-md border border-[var(--border-default)] px-4 text-sm transition-colors hover:bg-[var(--bg-elev-3)]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {pending ? "در حال ذخیره…" : "ذخیره"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  برند                                                                        */
/* -------------------------------------------------------------------------- */

export type BrandValues = {
  id?: string;
  name: string;
  slug: string;
  latinName: string;
  country: string;
  description: string;
  website: string;
  logoUrl: string;
  position: string;
  isActive: boolean;
  isFeatured: boolean;
};

export function BrandDialog({
  values,
  trigger,
}: {
  values: BrandValues;
  trigger: TriggerConfig;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const action = saveBrand.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);

  // بستن مودال پس از ذخیره موفق — در زمان رندر، نه داخل effect
  const [lastState, setLastState] = React.useState(state);
  if (lastState !== state) {
    setLastState(state);
    if (state.status === "success") setOpen(false);
  }

  // نمایش نوتیفیکیشن، همگام‌سازی با یک سیستم بیرونی است و جای درستش effect است
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

      <Modal open={open} onClose={() => setOpen(false)} title={values.id ? `ویرایش «${values.name}»` : "برند جدید"} size="md">
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="نام برند" htmlFor="brand-name" required error={state.errors?.name}>
              <Input id="brand-name" name="name" defaultValue={values.name} required />
            </Field>

            <Field label="نام لاتین" htmlFor="brand-latin">
              <Input id="brand-latin" name="latinName" defaultValue={values.latinName} dir="ltr" className="text-start" />
            </Field>

            <Field label="نامک (slug)" htmlFor="brand-slug" hint="خالی = ساخت خودکار">
              <Input id="brand-slug" name="slug" defaultValue={values.slug} dir="ltr" className="text-start font-mono text-xs" />
            </Field>

            <Field label="کشور سازنده" htmlFor="brand-country">
              <Input id="brand-country" name="country" defaultValue={values.country} />
            </Field>

            <Field label="وب‌سایت" htmlFor="brand-site">
              <Input id="brand-site" name="website" defaultValue={values.website} dir="ltr" className="text-start" />
            </Field>

            <Field label="نشانی لوگو" htmlFor="brand-logo">
              <Input id="brand-logo" name="logoUrl" defaultValue={values.logoUrl} dir="ltr" className="text-start" placeholder="/images/brands/example.svg" />
            </Field>

            <Field label="ترتیب نمایش" htmlFor="brand-position">
              <Input id="brand-position" name="position" defaultValue={values.position} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <Field label="توضیحات" htmlFor="brand-desc" className="sm:col-span-2">
              <Textarea id="brand-desc" name="description" rows={3} defaultValue={values.description} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-6 border-t border-[var(--border-hairline)] pt-4">
            <Checkbox name="isActive" defaultChecked={values.isActive} label="فعال" />
            <Checkbox name="isFeatured" defaultChecked={values.isFeatured} label="برند شاخص" />
          </div>

          {state.status === "error" && state.message && (
            <p className="rounded-md border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger-text)]">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-md border border-[var(--border-default)] px-4 text-sm transition-colors hover:bg-[var(--bg-elev-3)]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {pending ? "در حال ذخیره…" : "ذخیره"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  دکمه حذف مشترک                                                             */
/* -------------------------------------------------------------------------- */

export function DeleteTaxonomyButton({
  kind,
  id,
  name,
  productCount = 0,
}: {
  kind: "category" | "brand";
  id: string;
  name: string;
  productCount?: number;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const readOnly = useReadOnly();


  if (readOnly) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`حذف ${name}`}
        title="حذف"
        className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger-text)]"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={pending}
        title={`حذف «${name}»؟`}
        description={
          kind === "brand" && productCount > 0
            ? `${toFaDigits(productCount)} محصول به این برند وصل است. با حذف برند، آن محصولات باقی می‌مانند ولی بدون برند می‌شوند.`
            : undefined
        }
        confirmLabel="حذف کن"
        onConfirm={() =>
          startTransition(async () => {
            const result = kind === "category" ? await deleteCategory(id) : await deleteBrand(id);
            toast({
              title: result.status === "success" ? "حذف شد" : "امکان حذف نیست",
              description: result.message,
              tone: result.status === "success" ? "success" : "error",
            });
            setOpen(false);
          })
        }
      />
    </>
  );
}
