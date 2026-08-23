import Link from "next/link";

import { Logomark } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <div className="blueprint grain flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logomark className="mb-8 size-16 text-[var(--brand)] opacity-70" />

      <p className="font-mono text-[4rem] font-bold leading-none text-[var(--brand)] opacity-25">404</p>

      <h1 className="mt-4 font-display text-2xl font-extrabold">این صفحه پیدا نشد</h1>
      <p className="mt-4 max-w-md text-sm leading-8 text-[var(--fg-muted)]">
        ممکن است نشانی را اشتباه وارد کرده باشید یا این صفحه جابه‌جا شده باشد. از فهرست زیر ادامه دهید.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
        >
          بازگشت به صفحه اصلی
        </Link>
        <Link
          href="/products"
          className="inline-flex h-11 items-center rounded-md border border-[var(--border-default)] px-5 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
        >
          کاتالوگ محصولات
        </Link>
      </div>
    </div>
  );
}
