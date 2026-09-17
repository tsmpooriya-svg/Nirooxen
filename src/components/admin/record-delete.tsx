"use client";

/**
 * =============================================================================
 *  دکمهٔ حذف رکوردهای عملیاتی — سفارش، مشتری، کاربر پنل
 * =============================================================================
 *  برخلاف دکمهٔ حذف دسته و برند، این سه مورد داده‌ای را پاک می‌کنند که جای
 *  دیگری بازسازی نمی‌شود. پس متن تأیید برای هر کدام صریح می‌گوید دقیقاً چه چیزی
 *  می‌رود و چه چیزی می‌ماند؛ «مطمئنید؟» به‌تنهایی کافی نیست وقتی کاربر نمی‌داند
 *  حذف مشتری سفارش‌هایش را هم می‌برد یا نه.
 *
 *  بررسی‌های امنیتی (حذف نکردن حساب خود، و آخرین مدیر ارشد) روی سرور هم هستند؛
 *  آنچه اینجاست فقط برای این است که کاربر به دکمه‌ای نخورد که قرار است رد شود.
 * =============================================================================
 */

import * as React from "react";
import { useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { toFaDigits } from "@/lib/utils";
import { deleteCustomer, deleteOrder, deleteUser } from "@/modules/admin/actions";

import { useReadOnly } from "./shell";

type Kind = "order" | "customer" | "user";

const LABEL: Record<Kind, string> = {
  order: "سفارش",
  customer: "مشتری",
  user: "کاربر",
};

export function RecordDeleteButton({
  kind,
  id,
  name,
  orderCount = 0,
  blockedReason,
}: {
  kind: Kind;
  id: string;
  name: string;
  /** فقط برای مشتری — تعداد سفارش‌هایی که بدون مشتری خواهند ماند */
  orderCount?: number;
  /** اگر پر باشد دکمه غیرفعال است و همین متن دلیلش را می‌گوید */
  blockedReason?: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const readOnly = useReadOnly();

  if (readOnly) return null;

  const description =
    kind === "order"
      ? "اقلام، رویدادها و پرداخت‌های ثبت‌شدهٔ این سفارش هم پاک می‌شوند. این کار برگشت‌پذیر نیست."
      : kind === "customer"
        ? orderCount > 0
          ? `${toFaDigits(orderCount)} سفارش این مشتری پاک نمی‌شود؛ باقی می‌ماند و بدون مشتری می‌شود. یادداشت‌های پرونده پاک می‌شوند.`
          : "یادداشت‌های این پرونده هم پاک می‌شوند. این کار برگشت‌پذیر نیست."
        : "نشست‌های باز این کاربر بسته می‌شود. سفارش‌ها، مطالب و لاگ‌هایی که ثبت کرده باقی می‌مانند و بدون نام می‌شوند.";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={Boolean(blockedReason)}
        aria-label={`حذف ${LABEL[kind]} ${name}`}
        title={blockedReason ?? "حذف"}
        className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger-text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-[var(--fg-subtle)]"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={pending}
        title={`حذف ${LABEL[kind]} «${name}»؟`}
        description={description}
        confirmLabel="حذف کن"
        onConfirm={() =>
          startTransition(async () => {
            const result =
              kind === "order"
                ? await deleteOrder(id)
                : kind === "customer"
                  ? await deleteCustomer(id)
                  : await deleteUser(id);
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
