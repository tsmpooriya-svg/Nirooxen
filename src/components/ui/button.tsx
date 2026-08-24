import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "signal" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "whitespace-nowrap select-none press outline-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 " +
  "[transition-timing-function:var(--ease-out-expo)] " +
  "focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-[var(--bg-base)] " +
  "disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--fg-on-brand)] shadow-[var(--shadow-sm)] " +
    "hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)] active:bg-[var(--brand-pressed)]",
  secondary:
    "bg-[var(--bg-elev-3)] text-[var(--fg-primary)] border border-[var(--border-subtle)] " +
    "hover:bg-[var(--bg-elev-2)] hover:border-[var(--border-default)]",
  outline:
    "border border-[var(--border-default)] text-[var(--fg-primary)] bg-transparent " +
    "hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]",
  ghost: "text-[var(--fg-secondary)] hover:bg-[var(--bg-elev-3)] hover:text-[var(--fg-primary)]",
  signal:
    "bg-[var(--signal)] text-[#241500] shadow-[var(--shadow-sm)] hover:brightness-110 " +
    "hover:shadow-[0_12px_36px_-12px_var(--glow-signal)]",
  danger:
    "bg-[var(--danger)] text-[var(--fg-on-danger)] hover:brightness-110 shadow-[var(--shadow-sm)]",
  link: "text-[var(--brand)] underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-meta",
  md: "h-11 px-5 text-sm",
  lg: "h-[3.25rem] px-7 text-[0.9375rem]",
  icon: "h-11 w-11",
  "icon-sm": "h-9 w-9",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** آیکون سمت راست متن (در RTL ابتدای دکمه) */
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, iconStart, iconEnd, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="anim-spin size-4 rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        iconStart
      )}
      {children}
      {!loading && iconEnd}
    </button>
  );
});

export type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
};

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {iconStart}
      {children}
      {iconEnd}
    </Link>
  );
}
