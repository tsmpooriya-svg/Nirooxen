import Link from "next/link";

import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

export type Crumb = { name: string; href: string };

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  const all: Crumb[] = [{ name: "صفحه اصلی", href: "/" }, ...items];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(all)} />
      <nav aria-label="مسیر صفحه" className={cn("py-4", className)}>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--fg-muted)]">
          {all.map((item, index) => {
            const last = index === all.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1.5">
                {last ? (
                  <span className="text-[var(--fg-secondary)]" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="transition-colors hover:text-[var(--brand)]">
                    {item.name}
                  </Link>
                )}
                {!last && (
                  <svg viewBox="0 0 16 16" className="size-3 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

/** سرصفحه صفحات داخلی */
export function PageHeader({
  title,
  description,
  crumbs,
  children,
}: {
  title: string;
  description?: string;
  crumbs: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <div className="blueprint relative overflow-hidden border-b border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
      <div
        className="anim-drift pointer-events-none absolute -top-40 start-1/3 -z-10 size-[28rem] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--glow-brand), transparent 70%)" }}
        aria-hidden
      />
      <div className="shell pb-10 pt-2">
        <Breadcrumb items={crumbs} />
        <h1 className="mt-2 font-display text-[1.75rem] font-extrabold tracking-tight sm:text-[2.25rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-8 text-[var(--fg-muted)]">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
