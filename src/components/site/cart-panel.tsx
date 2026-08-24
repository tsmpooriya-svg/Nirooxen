"use client";

import Link from "next/link";
import * as React from "react";

import { useCart, useCartCount, useCartSubtotal } from "@/modules/cart/store";
import { useMounted } from "@/lib/use-mounted";
import { cn, formatPrice, toFaDigits } from "@/lib/utils";

/** نشانگر سبد استعلام در هدر */
export function CartButton() {
  const count = useCartCount();
  const toggle = useCart((s) => s.toggle);
  // شمارنده فقط پس از هیدریشن رندر می‌شود تا با HTML سرور تفاوت نداشته باشد
  const mounted = useMounted();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`سبد استعلام${mounted && count ? ` — ${count} قلم` : ""}`}
      className="relative grid size-10 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3h2l1.6 8.4a1.5 1.5 0 0 0 1.5 1.2h6.3a1.5 1.5 0 0 0 1.5-1.2L17 6H5.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="16" r="1.2" />
        <circle cx="14.5" cy="16" r="1.2" />
      </svg>
      {mounted && count > 0 && (
        <span className="anim-pop absolute -top-1.5 -end-1.5 grid min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1 font-mono text-[0.625rem] font-bold text-[var(--fg-on-brand)]">
          {toFaDigits(count)}
        </span>
      )}
    </button>
  );
}

/** کشوی سبد استعلام */
export function CartPanel() {
  const { lines, isOpen, close, remove, setQuantity } = useCart();
  const { total, hasHiddenPrice } = useCartSubtotal();
  const mounted = useMounted();

  React.useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, mounted]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!mounted) return null;

  return (
    <div
      className={cn("fixed inset-0 z-[80]", isOpen ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!isOpen}
    >
      <div
        onClick={close}
        className={cn(
          "absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm transition-opacity duration-400",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-label="سبد استعلام"
        className={cn(
          "absolute inset-y-0 start-0 flex w-[min(26rem,92vw)] flex-col border-e border-[var(--border-subtle)]",
          "bg-[var(--bg-elev-1)] shadow-[var(--shadow-xl)] transition-transform duration-500",
          "[transition-timing-function:var(--ease-out-expo)]",
          isOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <header className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-[var(--border-hairline)] px-5">
          <div>
            <h2 className="font-display text-base font-bold">سبد استعلام</h2>
            <p className="mt-0.5 text-xs text-[var(--fg-subtle)]">
              {lines.length ? `${toFaDigits(lines.length)} قلم کالا` : "هنوز کالایی اضافه نشده"}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="بستن"
            className="grid size-9 place-items-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elev-3)] hover:text-[var(--fg-primary)]"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="grid size-16 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--fg-subtle)]">
                <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M3.5 3.5h2.6l2 10.2a1.8 1.8 0 0 0 1.8 1.4h7.6a1.8 1.8 0 0 0 1.8-1.4l1.4-6.5H6.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="19.5" r="1.5" />
                  <circle cx="17.5" cy="19.5" r="1.5" />
                </svg>
              </span>
              <p className="text-sm text-[var(--fg-muted)]">
                محصولات موردنظرتان را به سبد اضافه کنید و یک‌جا استعلام قیمت بگیرید.
              </p>
              <Link
                href="/products"
                onClick={close}
                className="text-sm font-medium text-[var(--brand)] underline-offset-4 hover:underline"
              >
                مشاهده محصولات
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-hairline)]">
              {lines.map((line) => (
                <li key={line.productId} className="flex gap-3.5 p-4">
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.imageUrl}
                      alt=""
                      className="size-16 shrink-0 rounded-sm border border-[var(--border-hairline)] object-cover"
                    />
                  ) : (
                    <span className="size-16 shrink-0 rounded-sm border border-[var(--border-hairline)] bg-[var(--bg-inset)]" />
                  )}

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${line.slug}`}
                      onClick={close}
                      className="clamp-2 text-[0.8125rem] font-medium leading-6 text-[var(--fg-primary)] transition-colors hover:text-[var(--brand)]"
                    >
                      {line.name}
                    </Link>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-md border border-[var(--border-subtle)]">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          aria-label="کاهش تعداد"
                          className="grid size-7 place-items-center text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                        >
                          <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3.5 8h9" strokeLinecap="round" />
                          </svg>
                        </button>
                        <span className="min-w-8 text-center font-mono text-xs">{toFaDigits(line.quantity)}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          aria-label="افزایش تعداد"
                          className="grid size-7 place-items-center text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                        >
                          <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>

                      <span className="text-xs text-[var(--fg-muted)]">
                        {line.priceMode === "PUBLIC" && line.unitPrice
                          ? formatPrice(line.unitPrice * line.quantity)
                          : "استعلامی"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    aria-label={`حذف ${line.name}`}
                    className="h-fit rounded-sm p-1 text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger-text)]"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <footer className="shrink-0 border-t border-[var(--border-hairline)] bg-[var(--bg-elev-2)] p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-[var(--fg-muted)]">جمع اقلام قیمت‌دار</span>
              <span className="font-display text-lg font-bold text-[var(--fg-primary)]">
                {formatPrice(total)}
              </span>
            </div>
            {hasHiddenPrice && (
              <p className="mb-4 rounded-md border border-[var(--border-brand)] bg-[var(--brand-soft)] p-3 text-xs leading-6 text-[var(--fg-secondary)]">
                قیمت برخی اقلام پس از بررسی کارشناس اعلام می‌شود؛ مبلغ بالا نهایی نیست.
              </p>
            )}
            <Link
              href="/quote"
              onClick={close}
              className="flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand)] font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
            >
              ثبت درخواست استعلام
              <svg viewBox="0 0 16 16" className="size-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
