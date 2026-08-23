import Link from "next/link";

import { cn, toFaDigits } from "@/lib/utils";

/**
 * صفحه‌بندی مبتنی بر لینک (نه دکمه) — یعنی قابل ایندکس، قابل باز کردن در تب
 * جدید و کارآمد بدون جاوااسکریپت.
 */
export function Pagination({
  page,
  pageCount,
  buildHref,
  className,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const pages: (number | "gap")[] = [];
  const push = (n: number) => pages.push(n);

  push(1);
  if (page > 3) pages.push("gap");
  for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) push(i);
  if (page < pageCount - 2) pages.push("gap");
  if (pageCount > 1) push(pageCount);

  const itemClass =
    "grid h-10 min-w-10 place-items-center rounded-md border px-3 font-mono text-sm transition-all duration-200";

  return (
    <nav aria-label="صفحه‌بندی" className={cn("mt-12 flex items-center justify-center gap-1.5", className)}>
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          aria-label="صفحه قبل"
          className={cn(itemClass, "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]")}
        >
          <svg viewBox="0 0 16 16" className="size-3.5 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}

      {pages.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-[var(--fg-subtle)]" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              itemClass,
              item === page
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]",
            )}
          >
            {toFaDigits(item)}
          </Link>
        ),
      )}

      {page < pageCount && (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          aria-label="صفحه بعد"
          className={cn(itemClass, "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]")}
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </nav>
  );
}
