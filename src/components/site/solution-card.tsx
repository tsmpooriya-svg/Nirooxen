import Link from "next/link";

import { DomainIcon } from "@/components/ui/icons";
import type { SolutionSummary } from "@/modules/solutions/queries";
import { cn, toFaDigits } from "@/lib/utils";

/**
 * کارت راهکار.
 *
 * برخلاف کارت محصول، عنصر اصلی اینجا «پرسش کاربر» است نه نام کالا — چون
 * کاربر این مسیر را وقتی انتخاب می‌کند که هنوز نام محصول را نمی‌داند.
 *
 * حالت `feature` برای خانه‌های بزرگ گرید استفاده می‌شود و شرح بیشتری نشان
 * می‌دهد؛ حالت پیش‌فرض فشرده است. هر دو از یک ساختار نشانه‌گذاری می‌آیند تا
 * رفتار RTL و دسترس‌پذیری یکسان بماند.
 */
export function SolutionCard({
  summary,
  variant = "default",
  index,
  className,
  headingLevel = "h3",
}: {
  summary: SolutionSummary;
  variant?: "default" | "feature";
  /** شماره ترتیبی که به‌صورت تزئینی مثل نقشه فنی نمایش داده می‌شود */
  index?: number;
  className?: string;
  /**
   * سطح تیتر کارت.
   *
   * در صفحه فهرست راهکارها کارت‌ها مستقیم زیر <h1> می‌نشینند، پس باید h2
   * باشند؛ داخل بخش‌های صفحه اصلی که یک <h2> بالای‌شان هست، h3 درست است.
   * پرش سطح تیتر برای صفحه‌خوان‌ها مشکل‌ساز است.
   */
  headingLevel?: "h2" | "h3";
}) {
  const { solution, productCount } = summary;
  const isFeature = variant === "feature";
  const Heading = headingLevel;

  return (
    <article className={cn("h-full", className)}>
      <Link
        href={`/solutions/${solution.slug}`}
        className={cn(
          "brackets group relative flex h-full flex-col overflow-hidden rounded-lg border",
          "border-[var(--border-subtle)] bg-[var(--bg-elev-1)] transition-all duration-500",
          "[transition-timing-function:var(--ease-out-expo)] hover:-translate-y-1",
          "hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]",
          isFeature ? "p-7 sm:p-9" : "p-6",
        )}
      >
        {/* شبکه بلوپرینت که هنگام هاور روشن می‌شود */}
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(to left, var(--grid-line-strong) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line-strong) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />

        <div className="relative mb-5 flex items-start justify-between gap-4">
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-lg border border-[var(--border-subtle)]",
              "bg-[var(--bg-elev-2)] text-[var(--brand)] transition-all duration-500",
              "group-hover:scale-105 group-hover:border-[var(--border-brand)] group-hover:bg-[var(--brand-soft)]",
              isFeature ? "size-16" : "size-12",
            )}
          >
            <DomainIcon name={solution.icon} className={isFeature ? "size-8" : "size-6"} />
          </span>

          {typeof index === "number" && (
            <span className="font-mono text-[0.625rem] tracking-[0.2em] text-[var(--fg-subtle)]" aria-hidden>
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
        </div>

        <p className="eyebrow relative mb-2.5">{solution.name}</p>

        {/* پرسش کاربر — تیتر واقعی کارت */}
        <Heading
          className={cn(
            "relative font-display font-bold tracking-tight transition-colors group-hover:text-[var(--brand)]",
            isFeature ? "text-xl leading-9 sm:text-[1.625rem] sm:leading-[1.5]" : "text-base leading-8",
          )}
        >
          {solution.question}
        </Heading>

        <p
          className={cn(
            "relative mt-3 text-[var(--fg-muted)]",
            isFeature ? "text-[0.9375rem] leading-8" : "clamp-2 text-[0.8125rem] leading-7",
          )}
        >
          {isFeature ? solution.situation : solution.summary}
        </p>

        <div className="relative mt-auto flex items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4 [margin-block-start:1.5rem]">
          <span className="font-mono text-[0.6875rem] text-[var(--fg-subtle)]">
            {productCount > 0 ? `${toFaDigits(productCount)} کالا` : "در حال تکمیل"}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] transition-all duration-300 group-hover:gap-3">
            مشاهده راهکار
            {/* در RTL فلش به سمت چپ اشاره می‌کند */}
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}
