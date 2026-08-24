"use client";

import Link from "next/link";
import * as React from "react";

import { OrderForm } from "@/components/site/order-form";
import { useMounted } from "@/lib/use-mounted";
import { formatPrice, toFaDigits } from "@/lib/utils";
import { useCart } from "@/modules/cart/store";

export function QuoteClient() {
  const { lines, setQuantity, remove, clear } = useCart();
  // سبد از localStorage می‌آید، پس تا پیش از هیدریشن نباید رندر شود
  const mounted = useMounted();

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-xl border border-[var(--border-subtle)]" />;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] px-6 py-20 text-center">
        <span className="mb-5 grid size-16 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--fg-subtle)]">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M3.5 3.5h2.6l2 10.2a1.8 1.8 0 0 0 1.8 1.4h7.6a1.8 1.8 0 0 0 1.8-1.4l1.4-6.5H6.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="19.5" r="1.5" />
            <circle cx="17.5" cy="19.5" r="1.5" />
          </svg>
        </span>
        <h2 className="font-display text-lg font-bold">سبد استعلام خالی است</h2>
        <p className="mt-3 max-w-md text-sm leading-8 text-[var(--fg-muted)]">
          محصولات موردنظرتان را از کاتالوگ انتخاب کنید تا بتوانید همه را در یک درخواست استعلام کنید.
        </p>
        <Link
          href="/products"
          className="mt-6 flex h-11 items-center rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
        >
          مشاهده کاتالوگ محصولات
        </Link>
      </div>
    );
  }

  const orderLines = lines.map((line) => ({
    productId: line.productId,
    productName: line.name,
    productSku: line.sku,
    productSlug: line.slug,
    imageUrl: line.imageUrl,
    unit: line.unit,
    unitPrice: line.priceMode === "PUBLIC" ? line.unitPrice : null,
    quantity: line.quantity,
  }));

  const subtotal = lines.reduce(
    (sum, l) => sum + (l.priceMode === "PUBLIC" && l.unitPrice ? l.unitPrice * l.quantity : 0),
    0,
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_26rem] lg:items-start">
      {/* جدول اقلام */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-5 py-4">
          <h2 className="font-display text-base font-bold">
            اقلام انتخاب‌شده ({toFaDigits(lines.length)})
          </h2>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger-text)]"
          >
            خالی کردن سبد
          </button>
        </div>

        <ul className="divide-y divide-[var(--border-hairline)]">
          {lines.map((line) => (
            <li key={line.productId} className="flex flex-wrap items-center gap-4 p-5">
              {line.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={line.imageUrl}
                  alt=""
                  className="size-20 shrink-0 rounded-md border border-[var(--border-hairline)] object-cover"
                />
              ) : (
                <span className="size-20 shrink-0 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-inset)]" />
              )}

              <div className="min-w-[12rem] flex-1">
                <Link
                  href={`/products/${line.slug}`}
                  className="text-[0.875rem] font-medium leading-7 transition-colors hover:text-[var(--brand)]"
                >
                  {line.name}
                </Link>
                {line.sku && (
                  <p className="mt-1 font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">
                    SKU {line.sku}
                  </p>
                )}
              </div>

              <div className="flex items-center rounded-md border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setQuantity(line.productId, line.quantity - 1)}
                  aria-label="کاهش تعداد"
                  className="grid size-9 place-items-center text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.5 8h9" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="min-w-10 text-center font-mono text-sm">{toFaDigits(line.quantity)}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.productId, line.quantity + 1)}
                  aria-label="افزایش تعداد"
                  className="grid size-9 place-items-center text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="w-32 text-end">
                <p className="text-sm font-semibold">
                  {line.priceMode === "PUBLIC" && line.unitPrice
                    ? formatPrice(line.unitPrice * line.quantity)
                    : "استعلامی"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => remove(line.productId)}
                aria-label={`حذف ${line.name}`}
                className="rounded-sm p-1.5 text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger-text)]"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        {subtotal > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-elev-2)] px-5 py-4">
            <span className="text-sm text-[var(--fg-muted)]">جمع اقلام دارای قیمت</span>
            <span className="font-display text-lg font-bold">{formatPrice(subtotal)}</span>
          </div>
        )}
      </div>

      {/* فرم */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
        <h2 className="mb-1 font-display text-base font-bold">اطلاعات تماس</h2>
        <p className="mb-5 text-xs leading-6 text-[var(--fg-muted)]">
          پس از ثبت، کارشناس فروش در اولین فرصت کاری با شما تماس می‌گیرد.
        </p>
        <OrderForm lines={orderLines} type="QUOTE" source="CART" compact />
      </div>
    </div>
  );
}
