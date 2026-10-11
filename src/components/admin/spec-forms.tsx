"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { DialogTrigger, type TriggerConfig } from "@/components/admin/dialog-trigger";
import { useReadOnly } from "./shell";
import { useToast } from "@/components/ui/toast";
import {
  deleteCategorySpec,
  deleteSpecDefinition,
  saveCategorySpec,
  saveSpecDefinition,
  saveUnit,
  type ActionState,
} from "@/modules/admin/actions";

const initialState: ActionState = { status: "idle" };

/** برچسب فارسی ابعاد فیزیکی — همان مقادیر enum پایگاه داده */
export const DIMENSION_LABELS: Record<string, string> = {
  POWER: "توان",
  LENGTH: "طول",
  FLOW: "دبی",
  PRESSURE: "فشار",
  VOLUME: "حجم",
  TEMPERATURE: "دما",
  VOLTAGE: "ولتاژ",
  MASS: "جرم",
  ROTATION: "دوران",
  COUNT: "شمارش",
  OTHER: "سایر",
};

export const DATA_TYPE_LABELS: Record<string, string> = {
  NUMBER: "عدد",
  RANGE: "بازه عددی",
  TEXT: "متن",
  BOOLEAN: "بله/خیر",
};

export const FILTER_UI_LABELS: Record<string, string> = {
  RANGE: "بازه (کمینه/بیشینه)",
  CHECKBOX: "چندانتخابی",
  BOOLEAN: "دارد/ندارد",
  NONE: "بدون فیلتر",
};

/** توست مشترک بعد از هر اکشن */
function useActionToast(state: ActionState, onSuccess?: () => void) {
  const { toast } = useToast();
  const [last, setLast] = React.useState(state);
  if (last !== state) {
    setLast(state);
    if (state.status === "success") onSuccess?.();
  }
  React.useEffect(() => {
    if (state.status === "idle") return;
    toast({
      title: state.status === "success" ? "ذخیره شد" : "خطا",
      description: state.message,
      tone: state.status === "success" ? "success" : "error",
    });
  }, [state, toast]);
}

/* -------------------------------------------------------------------------- */
/*  واحد                                                                        */
/* -------------------------------------------------------------------------- */

export type UnitValues = {
  id?: string;
  code: string;
  label: string;
  symbol: string;
  dimension: string;
  toBaseFactor: string;
  isBase: boolean;
  isActive: boolean;
  position: string;
};

export function UnitDialog({
  values,
  trigger,
}: {
  values: UnitValues;
  trigger: TriggerConfig;
}) {
  const [open, setOpen] = React.useState(false);
  const action = saveUnit.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, () => setOpen(false));

  return (
    <>
      <DialogTrigger config={trigger} onOpen={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={values.id ? `ویرایش «${values.label}»` : "واحد جدید"} size="md">
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="شناسه ماشینی" htmlFor="u-code" required error={state.errors?.code} hint="مثل kw یا hp">
              <Input id="u-code" name="code" defaultValue={values.code} dir="ltr" className="text-start font-mono text-xs" required />
            </Field>

            <Field label="برچسب فارسی" htmlFor="u-label" required error={state.errors?.label}>
              <Input id="u-label" name="label" defaultValue={values.label} required />
            </Field>

            <Field label="نماد" htmlFor="u-symbol" hint="مثل kW">
              <Input id="u-symbol" name="symbol" defaultValue={values.symbol} dir="ltr" className="text-start font-mono text-xs" />
            </Field>

            <Field label="بُعد فیزیکی" htmlFor="u-dimension" required>
              <Select id="u-dimension" name="dimension" defaultValue={values.dimension}>
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Field>

            <Field
              label="ضریب تبدیل به واحد پایه"
              htmlFor="u-factor"
              required
              error={state.errors?.toBaseFactor}
              hint="واحد پایه = ۱. مثلاً اسب بخار = ۰٫۷۴۵۷ کیلووات"
              className="sm:col-span-2"
            >
              <Input id="u-factor" name="toBaseFactor" defaultValue={values.toBaseFactor} dir="ltr" inputMode="decimal" className="text-start font-mono" required />
            </Field>

            <Field label="ترتیب" htmlFor="u-position">
              <Input id="u-position" name="position" defaultValue={values.position} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <Checkbox name="isBase" label="واحد پایه این بُعد" defaultChecked={values.isBase} hint="در هر بُعد فقط یکی" />
              <Checkbox name="isActive" label="فعال" defaultChecked={values.isActive} />
            </div>
          </div>

          <FormFooter pending={pending} onCancel={() => setOpen(false)} label="ذخیره واحد" />
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  تعریف مشخصه                                                                 */
/* -------------------------------------------------------------------------- */

export type SpecDefinitionValues = {
  id?: string;
  key: string;
  label: string;
  description: string;
  dataType: string;
  dimension: string;
  defaultUnitId: string;
  groupName: string;
  isFilterable: boolean;
  filterUi: string;
  isActive: boolean;
  position: string;
};

export function SpecDefinitionDialog({
  values,
  units,
  trigger,
}: {
  values: SpecDefinitionValues;
  units: { id: string; label: string; dimension: string }[];
  trigger: TriggerConfig;
}) {
  const [open, setOpen] = React.useState(false);
  const action = saveSpecDefinition.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, () => setOpen(false));

  return (
    <>
      <DialogTrigger config={trigger} onOpen={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={values.id ? `ویرایش «${values.label}»` : "مشخصه جدید"} size="lg">
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="شناسه ماشینی" htmlFor="sd-key" required error={state.errors?.key} hint="در آدرس فیلتر استفاده می‌شود، مثل head">
              <Input id="sd-key" name="key" defaultValue={values.key} dir="ltr" className="text-start font-mono text-xs" required />
            </Field>

            <Field label="برچسب فارسی" htmlFor="sd-label" required error={state.errors?.label}>
              <Input id="sd-label" name="label" defaultValue={values.label} required />
            </Field>

            <Field label="نوع داده" htmlFor="sd-type" required hint="نوع، ستون مقدار را تعیین می‌کند">
              <Select id="sd-type" name="dataType" defaultValue={values.dataType}>
                {Object.entries(DATA_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Field>

            <Field label="بُعد فیزیکی" htmlFor="sd-dimension" hint="فقط برای مشخصه عددی">
              <Select id="sd-dimension" name="dimension" defaultValue={values.dimension}>
                <option value="">— ندارد —</option>
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Field>

            <Field label="واحد پیش‌فرض" htmlFor="sd-unit">
              <Select id="sd-unit" name="defaultUnitId" defaultValue={values.defaultUnitId}>
                <option value="">— بدون واحد —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} ({DIMENSION_LABELS[u.dimension] ?? u.dimension})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="گروه نمایش" htmlFor="sd-group" hint="مثل عملکرد، موتور، ساختار">
              <Input id="sd-group" name="groupName" defaultValue={values.groupName} />
            </Field>

            <Field label="نوع فیلتر" htmlFor="sd-filterui">
              <Select id="sd-filterui" name="filterUi" defaultValue={values.filterUi}>
                {Object.entries(FILTER_UI_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Field>

            <Field label="ترتیب" htmlFor="sd-position">
              <Input id="sd-position" name="position" defaultValue={values.position} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <Field label="توضیح" htmlFor="sd-desc" className="sm:col-span-2">
              <Textarea id="sd-desc" name="description" rows={2} defaultValue={values.description} />
            </Field>

            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <Checkbox
                name="isFilterable"
                label="قابل فیلتر"
                defaultChecked={values.isFilterable}
                hint="در ستون فیلتر صفحه محصولات نمایش داده می‌شود"
              />
              <Checkbox name="isActive" label="فعال" defaultChecked={values.isActive} />
            </div>
          </div>

          <FormFooter pending={pending} onCancel={() => setOpen(false)} label="ذخیره مشخصه" />
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  اتصال مشخصه به دسته‌بندی                                                    */
/* -------------------------------------------------------------------------- */

export function CategorySpecDialog({
  categories,
  definitions,
  trigger,
}: {
  categories: { id: string; name: string }[];
  definitions: { id: string; label: string; key: string }[];
  trigger: TriggerConfig;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(saveCategorySpec, initialState);
  useActionToast(state, () => setOpen(false));

  return (
    <>
      <DialogTrigger config={trigger} onOpen={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="اتصال مشخصه به دسته‌بندی" size="md">
        <form action={formAction} className="space-y-5">
          <p className="rounded-md border border-[var(--border-brand)] bg-[var(--brand-soft)] p-3 text-xs leading-6 text-[var(--fg-secondary)]">
            هر مشخصه‌ای که به یک دسته وصل شود و «قابل فیلتر» باشد، بلافاصله در ستون فیلتر آن دسته
            روی سایت ظاهر می‌شود — بدون تغییر کد.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="دسته‌بندی" htmlFor="cs-cat" required error={state.errors?.categoryId}>
              <Select id="cs-cat" name="categoryId" defaultValue="">
                <option value="">— انتخاب کنید —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="مشخصه فنی" htmlFor="cs-def" required error={state.errors?.definitionId}>
              <Select id="cs-def" name="definitionId" defaultValue="">
                <option value="">— انتخاب کنید —</option>
                {definitions.map((d) => (
                  <option key={d.id} value={d.id}>{d.label} ({d.key})</option>
                ))}
              </Select>
            </Field>

            <Field label="ترتیب" htmlFor="cs-position">
              <Input id="cs-position" name="position" defaultValue="0" dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <div className="flex items-center sm:col-span-2">
              <Checkbox name="isKey" label="نمایش در کارت محصول" hint="مشخصه کلیدی این دسته" />
            </div>
          </div>

          <FormFooter pending={pending} onCancel={() => setOpen(false)} label="ذخیره اتصال" />
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  حذف                                                                         */
/* -------------------------------------------------------------------------- */

export function DeleteSpecButton({
  kind,
  id,
  name,
}: {
  kind: "definition" | "link";
  id: string;
  name: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const readOnly = useReadOnly();
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = kind === "definition" ? await deleteSpecDefinition(id) : await deleteCategorySpec(id);
      toast({
        title: result.status === "success" ? "حذف شد" : "خطا",
        description: result.message,
        tone: result.status === "success" ? "success" : "error",
      });
      if (result.status === "success") setOpen(false);
    });
  }


  if (readOnly) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`حذف ${name}`}
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
        title={`حذف «${name}»؟`}
        description={
          kind === "definition"
            ? "اگر این مشخصه روی محصولی استفاده شده باشد، حذف انجام نمی‌شود و پیام راهنما نمایش داده می‌شود."
            : "این مشخصه از فیلترهای این دسته‌بندی برداشته می‌شود. مقادیر محصولات دست‌نخورده می‌مانند."
        }
        confirmLabel="حذف"
        tone="danger"
      />
    </>
  );
}

function FormFooter({
  pending,
  onCancel,
  label,
}: {
  pending: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-[var(--border-hairline)] pt-5">
      <button
        type="button"
        onClick={onCancel}
        className="h-10 rounded-md border border-[var(--border-subtle)] px-4 text-sm text-[var(--fg-secondary)] transition-colors hover:border-[var(--border-default)]"
      >
        انصراف
      </button>
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-60"
      >
        {pending ? "در حال ذخیره…" : label}
      </button>
    </div>
  );
}
