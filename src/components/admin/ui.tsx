import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { ToneKey } from "@/lib/constants";
import { cn, toFaDigits } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  سرصفحه صفحه پنل                                                            */
/* -------------------------------------------------------------------------- */

export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href: string }[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="مسیر" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--fg-subtle)]">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={item.href}>
                {index > 0 && <span aria-hidden>/</span>}
                <Link href={item.href} className="transition-colors hover:text-[var(--brand)]">
                  {item.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="font-display text-xl font-bold sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 text-meta text-[var(--fg-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  کارت آمار                                                                   */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  tone = "brand",
  icon,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: ToneKey;
  icon?: React.ReactNode;
  href?: string;
}) {
  const toneColor =
    tone === "brand"
      ? "var(--brand)"
      : tone === "ok"
        ? "var(--ok)"
        : tone === "warn"
          ? "var(--warn)"
          : tone === "danger"
            ? "var(--danger)"
            : "var(--info)";

  const content = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border border-[var(--border-subtle)]",
        "bg-[var(--bg-elev-1)] p-5 transition-all duration-400",
        "[transition-timing-function:var(--ease-out-expo)]",
        href && "hover:-translate-y-0.5 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]",
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(to left, transparent, ${toneColor}, transparent)` }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-micro text-[var(--fg-muted)]">{label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold leading-none" style={{ color: toneColor }}>
            {typeof value === "number" ? toFaDigits(value) : value}
          </p>
          {hint && <p className="mt-2 text-micro leading-5 text-[var(--fg-subtle)]">{hint}</p>}
        </div>
        {icon && (
          <span
            className="grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-400 group-hover:scale-110"
            style={{ background: `color-mix(in oklab, ${toneColor} 12%, transparent)`, color: toneColor }}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

/* -------------------------------------------------------------------------- */
/*  پنل و جدول                                                                  */
/* -------------------------------------------------------------------------- */

export function Panel({
  title,
  action,
  children,
  className,
  padded = true,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)]",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-hairline)] px-5 py-4">
          {title && <h2 className="font-display text-sm font-bold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function DataTable({
  head,
  children,
  empty,
}: {
  head: React.ReactNode[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-start text-meta">
        <thead>
          <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elev-2)]">
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-start text-micro font-medium text-[var(--fg-muted)]"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-hairline)]">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-16 text-center text-sm text-[var(--fg-subtle)]">
                رکوردی برای نمایش وجود ندارد.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5 align-middle", className)} {...props} />;
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-[var(--bg-elev-2)]", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/*  برچسب وضعیت                                                                */
/* -------------------------------------------------------------------------- */

export function StatusBadge({
  map,
  value,
  size = "sm",
}: {
  map: Record<string, { label: string; tone: ToneKey }>;
  value: string;
  size?: "sm" | "md";
}) {
  const entry = map[value] ?? { label: value, tone: "neutral" as ToneKey };
  return (
    <Badge tone={entry.tone} size={size} dot>
      {entry.label}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*  حالت خالی                                                                   */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--fg-subtle)]">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M3.5 10h17M8 5v14" opacity=".5" />
        </svg>
      </span>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-meta leading-7 text-[var(--fg-muted)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
