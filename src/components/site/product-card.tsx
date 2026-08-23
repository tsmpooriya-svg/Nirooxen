"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { useSiteSettings } from "@/components/site/settings-provider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { STOCK_STATUS } from "@/lib/constants";
import { cn, formatPrice, toFaDigits } from "@/lib/utils";
import { useCart } from "@/modules/cart/store";
import type { ProductCardData } from "@/modules/catalog/queries";

export function ProductCard({
  product,
  className,
  compact,
}: {
  product: ProductCardData;
  className?: string;
  compact?: boolean;
}) {
  const add = useCart((s) => s.add);
  // اگر مدیر سبد استعلام را خاموش کند، دکمه افزودن هم باید برود
  const cartEnabled = useSiteSettings()?.features.cart ?? true;
  const { toast } = useToast();
  const stock = STOCK_STATUS[product.stockStatus];
  const hasPrice = product.priceMode === "PUBLIC" && product.price;
  const discount =
    hasPrice && product.comparePrice && product.comparePrice > product.price!
      ? Math.round(((product.comparePrice - product.price!) / product.comparePrice) * 100)
      : null;

  function onAdd(event: React.MouseEvent) {
    event.preventDefault();
    add({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      imageUrl: product.imageUrl,
      unit: product.unit,
      unitPrice: product.price,
      priceMode: product.priceMode,
    });
    toast({
      title: "به سبد استعلام اضافه شد",
      description: product.name,
      tone: "success",
    });
  }

  return (
    <article
      className={cn(
        "brackets group relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)]",
        "bg-[var(--bg-elev-1)] transition-all duration-400 [transition-timing-function:var(--ease-out-expo)]",
        "hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]",
        className,
      )}
    >
      {/* تصویر */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-4/3 overflow-hidden bg-[var(--bg-inset)]"
        tabIndex={-1}
        aria-hidden
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-[1.06]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[var(--fg-subtle)]">
            <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m6 16 4-4 3 3 2-2 3 3" />
            </svg>
          </span>
        )}

        {/* درخشش نرم هنگام هاور */}
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-base)]/70 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-40"
          aria-hidden
        />

        <span className="absolute start-3 top-3 flex flex-col gap-1.5">
          {product.isNew && (
            <Badge tone="brand" size="sm">
              جدید
            </Badge>
          )}
          {discount && (
            <Badge tone="signal" size="sm">
              {toFaDigits(discount)}٪ تخفیف
            </Badge>
          )}
        </span>

        <span className="absolute end-3 top-3">
          <Badge tone={stock.tone} size="sm" dot>
            {stock.label}
          </Badge>
        </span>
      </Link>

      {/* محتوا */}
      <div className={cn("flex flex-1 flex-col p-4", !compact && "sm:p-5")}>
        <div className="mb-2 flex items-center gap-2 font-mono text-[0.625rem] tracking-wider text-[var(--fg-subtle)]">
          {product.brandName && (
            <Link
              href={`/brands/${product.brandSlug}`}
              className="uppercase transition-colors hover:text-[var(--brand)]"
            >
              {product.brandName}
            </Link>
          )}
          {product.brandName && product.model && <span aria-hidden>·</span>}
          {product.model && <span dir="ltr">{product.model}</span>}
        </div>

        <h3 className="mb-2">
          <Link
            href={`/products/${product.slug}`}
            className="clamp-2 text-[0.9375rem] font-semibold leading-7 text-[var(--fg-primary)] transition-colors group-hover:text-[var(--brand)]"
          >
            {product.name}
          </Link>
        </h3>

        {/* مشخصات کلیدی — همان چیزی که خریدار صنعتی اول نگاه می‌کند */}
        {product.keySpecs.length > 0 && !compact && (
          <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-y border-[var(--border-hairline)] py-3">
            {product.keySpecs.slice(0, 2).map((spec) => (
              <div key={spec.label} className="min-w-0">
                <dt className="truncate text-[0.6875rem] text-[var(--fg-subtle)]">{spec.label}</dt>
                <dd className="truncate text-xs font-medium text-[var(--fg-secondary)]">
                  {spec.value}
                  {spec.unit && <span className="text-[var(--fg-subtle)]"> {spec.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto">
          <div className="mb-3 flex items-end justify-between gap-2">
            {hasPrice ? (
              <div>
                {discount && (
                  <span className="block text-xs text-[var(--fg-subtle)] line-through">
                    {formatPrice(product.comparePrice, { withUnit: false })}
                  </span>
                )}
                <span className="font-display text-base font-bold text-[var(--fg-primary)]">
                  {formatPrice(product.price)}
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium text-[var(--brand)]">
                {product.priceMode === "CALL" ? "تماس بگیرید" : "استعلام قیمت"}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href={`/products/${product.slug}`}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--brand)] text-[0.8125rem] font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
            >
              {product.priceMode === "PUBLIC" ? "ثبت سفارش" : "استعلام قیمت"}
            </Link>
            {cartEnabled && (
            <button
              type="button"
              onClick={onAdd}
              aria-label={`افزودن ${product.name} به سبد استعلام`}
              title="افزودن به سبد استعلام"
              className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            >
              <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h2l1.6 8.4a1.5 1.5 0 0 0 1.5 1.2h6.3a1.5 1.5 0 0 0 1.5-1.2L17 6H5.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8.5" cy="16" r="1.2" />
                <circle cx="14.5" cy="16" r="1.2" />
              </svg>
            </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
