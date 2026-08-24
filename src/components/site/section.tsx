import Link from "next/link";
import * as React from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/** تیتر استاندارد بخش‌ها — ریتم تایپوگرافی سایت را یکدست نگه می‌دارد */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /**
   * start  — تیتر بالای محتوا، اکشن در انتهای همان ردیف (حالت پیش‌فرض)
   * center — وسط‌چین
   * stack  — ستونی و بدون فاصله پایین؛ برای وقتی تیتر در ستون کناری می‌نشیند
   */
  align?: "start" | "center" | "stack";
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align !== "stack" && "mb-10 sm:mb-12",
        align === "center" && "items-center text-center",
        align === "start" && "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className="eyebrow mb-3 flex items-center gap-2.5">
            <span className="inline-block h-px w-8 bg-[var(--brand)]" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-section font-bold">{title}</h2>
        {description && (
          <p className="mt-4 text-[0.9375rem] leading-8 text-[var(--fg-muted)]">{description}</p>
        )}
      </Reveal>

      {action && (
        <Reveal delay={120} className="shrink-0">
          <Link
            href={action.href}
            className="group inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--fg-secondary)] transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
          >
            {action.label}
            <svg
              viewBox="0 0 16 16"
              className="size-3.5 rotate-180 transition-transform duration-300 group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden
            >
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </Reveal>
      )}
    </div>
  );
}

/** پوشش بخش با فاصله عمودی یکسان */
export function Section({
  children,
  className,
  id,
  blueprint,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  blueprint?: boolean;
}) {
  return (
    <section id={id} className={cn("relative py-16 sm:py-20 lg:py-24", blueprint && "blueprint", className)}>
      {children}
    </section>
  );
}
