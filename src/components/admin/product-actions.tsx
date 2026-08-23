"use client";

import Link from "next/link";
import * as React from "react";
import { useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { toFaDigits } from "@/lib/utils";
import { bulkUpdateProductStatus, deleteProduct } from "@/modules/admin/actions";

/** دکمه‌های ردیف: مشاهده در سایت، ویرایش، حذف */
export function ProductRowActions({
  productId,
  slug,
  name,
}: {
  productId: string;
  slug: string;
  name: string;
}) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex items-center gap-0.5">
        <Link
          href={`/products/${slug}`}
          target="_blank"
          aria-label={`مشاهده ${name} در سایت`}
          title="مشاهده در سایت"
          className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 3h7v7M13 3 6.5 9.5M11 10.5V13H3V5h2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Link
          href={`/admin/products/${productId}`}
          aria-label={`ویرایش ${name}`}
          title="ویرایش"
          className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={`حذف ${name}`}
          title="حذف"
          className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger)]"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        loading={pending}
        title={`حذف «${name}»؟`}
        confirmLabel="حذف کن"
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteProduct(productId);
            toast({
              title: result.status === "success" ? "حذف شد" : "خطا",
              description: result.message,
              tone: result.status === "success" ? "success" : "error",
            });
            setConfirmOpen(false);
          })
        }
      />
    </>
  );
}

/**
 * نوار عملیات گروهی.
 *
 * به‌جای مدیریت state انتخاب در سطح هر ردیف، این کامپوننت کل جدول را در بر
 * می‌گیرد و چک‌باکس‌های داخل آن را با DOM API می‌خواند — همان الگویی که فرم‌های
 * HTML بومی استفاده می‌کنند و باعث می‌شود ردیف‌ها Server Component بمانند.
 */
export function ProductBulkBar({
  productIds,
  children,
}: {
  productIds: string[];
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const refresh = React.useCallback(() => {
    const boxes = containerRef.current?.querySelectorAll<HTMLInputElement>('input[name="bulk"]:checked');
    setSelected(Array.from(boxes ?? []).map((box) => box.value));
  }, []);

  function toggleAll(checked: boolean) {
    const boxes = containerRef.current?.querySelectorAll<HTMLInputElement>('input[name="bulk"]');
    boxes?.forEach((box) => (box.checked = checked));
    setSelected(checked ? productIds : []);
  }

  function apply(status: "PUBLISHED" | "DRAFT" | "ARCHIVED") {
    startTransition(async () => {
      const result = await bulkUpdateProductStatus(selected, status);
      toast({
        title: result.status === "success" ? "انجام شد" : "خطا",
        description: result.message,
        tone: result.status === "success" ? "success" : "error",
      });
      if (result.status === "success") toggleAll(false);
    });
  }

  return (
    <div ref={containerRef} onChange={refresh}>
      <div
        className={
          "mb-3 flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-all duration-300 " +
          (selected.length > 0
            ? "border-[var(--border-brand)] bg-[var(--brand-soft)] opacity-100"
            : "border-[var(--border-hairline)] bg-[var(--bg-elev-1)] opacity-70")
        }
      >
        <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--fg-secondary)]">
          <input
            type="checkbox"
            onChange={(e) => toggleAll(e.target.checked)}
            checked={selected.length > 0 && selected.length === productIds.length}
            className="size-4 accent-[var(--brand)]"
          />
          انتخاب همه
        </label>

        <span className="text-xs text-[var(--fg-muted)]">
          {selected.length > 0 ? `${toFaDigits(selected.length)} مورد انتخاب شده` : "برای عملیات گروهی، محصولات را انتخاب کنید"}
        </span>

        <div className="ms-auto flex gap-2">
          {(["PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={selected.length === 0 || pending}
              onClick={() => apply(status)}
              className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-[0.6875rem] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)] disabled:opacity-40"
            >
              {status === "PUBLISHED" ? "انتشار" : status === "DRAFT" ? "پیش‌نویس" : "بایگانی"}
            </button>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
