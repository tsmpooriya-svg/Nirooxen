"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * مرز خطای ریشه.
 *
 * `error.tsx` فقط خطاهای درون صفحه‌ها را می‌گیرد؛ اگر خودِ layout ریشه خطا
 * بدهد (مثلاً هنگام ساخت متادیتا)، آن مرز هرگز رندر نمی‌شود و کاربر صفحهٔ
 * پیش‌فرض و بی‌سبک Next را می‌بیند. این فایل همان حالت را پوشش می‌دهد و چون
 * جایگزین layout می‌شود، باید خودش html و body را بسازد.
 *
 * هیچ جزئیاتی از خطا به کاربر نشان داده نمی‌شود — فقط digest که برای پیدا
 * کردن همان خطا در لاگ سرور به کار می‌آید.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] خطای غیرمنتظره در ریشه:", error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl" data-theme="dark">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <span className="mb-6 grid size-16 place-items-center rounded-full border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)]">
            <svg viewBox="0 0 24 24" className="size-7 text-[var(--danger-text)]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 8v5M12 16.5h.01" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>

          <h1 className="font-display text-xl font-bold">سرویس در دسترس نیست</h1>
          <p className="mt-4 max-w-md text-sm leading-8 text-[var(--fg-muted)]">
            در حال حاضر نمی‌توانیم این صفحه را نمایش دهیم. لطفاً کمی بعد دوباره تلاش کنید؛ اگر
            تکرار شد با ما تماس بگیرید.
          </p>

          {error.digest && (
            <p className="mt-3 font-mono text-micro text-[var(--fg-subtle)]">کد خطا: {error.digest}</p>
          )}

          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex h-11 items-center rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
          >
            تلاش دوباره
          </button>
        </div>
      </body>
    </html>
  );
}
