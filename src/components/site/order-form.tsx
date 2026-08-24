"use client";

import Link from "next/link";
import * as React from "react";
import { useActionState } from "react";

import { Field, Input, Textarea } from "@/components/ui/field";
import { PROVINCES } from "@/lib/constants";
import { cn, formatPrice, toFaDigits } from "@/lib/utils";
import { createOrder, type OrderActionState } from "@/modules/orders/actions";

export type OrderLineInput = {
  productId?: string;
  productName: string;
  productSku?: string | null;
  productSlug?: string | null;
  imageUrl?: string | null;
  unit?: string;
  unitPrice?: number | null;
  quantity: number;
};

const initialState: OrderActionState = { status: "idle" };

/**
 * فرم ثبت سفارش / استعلام قیمت.
 *
 * از useActionState استفاده می‌کند: فرم بدون جاوااسکریپت هم کار می‌کند
 * (progressive enhancement) و با جاوااسکریپت، وضعیت pending و خطاهای فیلدی
 * بدون رفرش صفحه نمایش داده می‌شوند.
 */
export function OrderForm({
  lines,
  type = "QUOTE",
  source = "PRODUCT_PAGE",
  onSuccess,
  compact,
}: {
  lines: OrderLineInput[];
  type?: "QUOTE" | "ORDER";
  source?: "PRODUCT_PAGE" | "CART" | "CONTACT_FORM";
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createOrder, initialState);

  React.useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [state.status, onSuccess]);

  const subtotal = lines.reduce(
    (sum, line) => sum + (line.unitPrice ? line.unitPrice * line.quantity : 0),
    0,
  );
  const hasUnpriced = lines.some((line) => !line.unitPrice);

  if (state.status === "success") {
    return <OrderSuccess message={state.message!} orderNumber={state.orderNumber} />;
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />

      {/* honeypot ضد ربات — برای کاربران نامرئی است */}
      <div className="absolute -left-[9999px] top-0" aria-hidden>
        <label htmlFor="website-hp">وب‌سایت</label>
        <input id="website-hp" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {/* خلاصه اقلام */}
      {!compact && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4">
          <p className="mb-3 text-meta font-medium text-[var(--fg-secondary)]">
            اقلام درخواست ({toFaDigits(lines.length)} قلم)
          </p>
          <ul className="space-y-2.5">
            {lines.map((line, index) => (
              <li key={`${line.productId ?? index}`} className="flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[var(--fg-primary)]">{line.productName}</span>
                  <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]">
                    {toFaDigits(line.quantity)} {line.unit ?? "دستگاه"}
                  </span>
                </span>
                <span className="shrink-0 text-[var(--fg-muted)]">
                  {line.unitPrice ? formatPrice(line.unitPrice * line.quantity) : "استعلامی"}
                </span>
              </li>
            ))}
          </ul>
          {subtotal > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-hairline)] pt-3">
              <span className="text-xs text-[var(--fg-muted)]">جمع اقلام قیمت‌دار</span>
              <span className="font-display text-sm font-bold">{formatPrice(subtotal)}</span>
            </div>
          )}
          {hasUnpriced && (
            <p className="mt-3 text-micro leading-6 text-[var(--fg-subtle)]">
              قیمت برخی اقلام پس از بررسی کارشناس اعلام می‌شود.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی" htmlFor="contactName" required error={state.errors?.contactName}>
          <Input
            id="contactName"
            name="contactName"
            autoComplete="name"
            placeholder="مثلاً: رضا کاظمی"
            invalid={Boolean(state.errors?.contactName)}
            required
          />
        </Field>

        <Field
          label="شماره تماس"
          htmlFor="contactPhone"
          required
          error={state.errors?.contactPhone}
          hint="کارشناس ما با همین شماره تماس می‌گیرد."
        >
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder="09121234567"
            className="text-start font-mono"
            invalid={Boolean(state.errors?.contactPhone)}
            required
          />
        </Field>

        <Field label="نام شرکت" htmlFor="contactCompany" hint="اختیاری — برای صدور پیش‌فاکتور رسمی">
          <Input id="contactCompany" name="contactCompany" autoComplete="organization" placeholder="اختیاری" />
        </Field>

        <Field label="استان / شهر" htmlFor="contactCity" hint="برای برآورد هزینه و زمان ارسال">
          <Input
            id="contactCity"
            name="contactCity"
            list="province-list"
            placeholder="اختیاری"
            autoComplete="address-level1"
          />
          <datalist id="province-list">
            {PROVINCES.map((province) => (
              <option key={province} value={province} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field
        label="ایمیل"
        htmlFor="contactEmail"
        error={state.errors?.contactEmail}
        hint="اختیاری — پیش‌فاکتور به این نشانی هم ارسال می‌شود."
      >
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder="you@company.com"
          className="text-start"
          invalid={Boolean(state.errors?.contactEmail)}
        />
      </Field>

      <Field
        label="توضیحات و شرایط پروژه"
        htmlFor="note"
        hint="هر چه دقیق‌تر بنویسید، پیشنهاد فنی ما دقیق‌تر خواهد بود: ارتفاع، دبی موردنیاز، نوع کاربری…"
      >
        <Textarea
          id="note"
          name="note"
          rows={4}
          placeholder="مثلاً: ساختمان ۸ طبقه، ۲۴ واحد، نیاز به تثبیت فشار در طبقات بالا…"
        />
      </Field>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)] p-3.5 text-meta leading-7 text-[var(--danger-text)]"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--brand)] text-sm font-medium",
          "text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)]",
          "hover:shadow-[var(--shadow-brand)] disabled:opacity-60",
        )}
      >
        {pending ? (
          <>
            <span className="anim-spin size-4 rounded-full border-2 border-current border-t-transparent" aria-hidden />
            در حال ثبت…
          </>
        ) : type === "QUOTE" ? (
          "ثبت درخواست استعلام قیمت"
        ) : (
          "ثبت سفارش"
        )}
      </button>

      <p className="text-center text-micro leading-6 text-[var(--fg-subtle)]">
        با ثبت این فرم، اطلاعات شما فقط برای پیگیری همین درخواست استفاده می‌شود.
      </p>
    </form>
  );
}

function OrderSuccess({ message, orderNumber }: { message: string; orderNumber?: string }) {
  return (
    <div className="anim-pop flex flex-col items-center rounded-lg border border-[color-mix(in_oklab,var(--ok)_40%,transparent)] bg-[var(--ok-soft)] p-8 text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-full border border-[color-mix(in_oklab,var(--ok)_45%,transparent)] bg-[var(--bg-elev-1)]">
        <svg viewBox="0 0 24 24" className="size-8 text-[var(--ok-text)]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <h3 className="font-display text-lg font-bold">درخواست شما ثبت شد</h3>
      <p className="mt-3 max-w-md text-meta leading-8 text-[var(--fg-secondary)]">{message}</p>

      {orderNumber && orderNumber !== "—" && (
        <p className="mt-5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-4 py-2.5 font-mono text-sm">
          شماره پیگیری: <span className="font-bold text-[var(--brand)]">{orderNumber}</span>
        </p>
      )}

      <Link
        href="/products"
        className="mt-6 text-sm font-medium text-[var(--brand)] underline-offset-4 hover:underline"
      >
        بازگشت به کاتالوگ محصولات
      </Link>
    </div>
  );
}
