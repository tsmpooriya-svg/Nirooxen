import * as React from "react";

import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** لبه گرادیانی ظریف — روی کارت‌های شاخص */
  lit?: boolean;
  interactive?: boolean;
  padded?: boolean;
};

export function Card({ className, lit, interactive, padded = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-[var(--border-subtle)]",
        "bg-[var(--bg-elev-1)] shadow-[var(--shadow-sm)]",
        padded && "p-5 sm:p-6",
        lit && "edge-lit",
        interactive && "hover-lift hover:border-[var(--border-brand)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-[var(--fg-primary)]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm leading-7 text-[var(--fg-muted)]", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex items-center gap-3 border-t border-[var(--border-hairline)] pt-4", className)}
      {...props}
    />
  );
}
