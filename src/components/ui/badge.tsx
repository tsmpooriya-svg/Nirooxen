import * as React from "react";

import type { ToneKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Fills are the OPAQUE --*-chip tokens rather than the translucent --*-soft
 * ones: badges are frequently absolutely positioned over product photography,
 * where a translucent fill lets the image decide the text contrast. With an
 * opaque chip the pairing is deterministic — 4.67–4.81:1 light, 5.69–8.30:1 dark.
 */
const tones: Record<ToneKey, string> = {
  brand: "bg-[var(--brand-chip)] text-[var(--brand-text)] border-[var(--border-brand)]",
  signal: "bg-[var(--signal-chip)] text-[var(--signal-text)] border-[color-mix(in_oklab,var(--signal)_35%,transparent)]",
  ok: "bg-[var(--ok-chip)] text-[var(--ok-text)] border-[color-mix(in_oklab,var(--ok)_35%,transparent)]",
  warn: "bg-[var(--warn-chip)] text-[var(--warn-text)] border-[color-mix(in_oklab,var(--warn)_35%,transparent)]",
  danger: "bg-[var(--danger-chip)] text-[var(--danger-text)] border-[color-mix(in_oklab,var(--danger)_35%,transparent)]",
  info: "bg-[var(--info-chip)] text-[var(--info-text)] border-[color-mix(in_oklab,var(--info)_35%,transparent)]",
  neutral: "bg-[var(--bg-elev-3)] text-[var(--fg-muted)] border-[var(--border-subtle)]",
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: ToneKey;
  size?: "sm" | "md";
  /** نقطه رنگی کوچک ابتدای برچسب */
  dot?: boolean;
};

export function Badge({ className, tone = "neutral", size = "md", dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium leading-none",
        size === "sm" ? "px-2 py-1 text-[0.6875rem]" : "px-2.5 py-1.5 text-xs",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
