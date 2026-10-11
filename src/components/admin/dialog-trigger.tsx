"use client";

import * as React from "react";

import { useReadOnly } from "./shell";

/**
 * دکمه بازکننده مودال.
 *
 * چرا این فایل وجود دارد؟ الگوی قبلی، یک تابع render-prop به کامپوننت
 * کلاینت پاس می‌داد:
 *
 *     <BrandDialog trigger={(open) => <button onClick={open}>…</button>} />
 *
 * در ری‌اکت ۱۹ / Next 16 نمی‌توان تابع را از Server Component به Client
 * Component پاس داد؛ نتیجه‌اش خطای زمان اجرا بود:
 * «Functions cannot be passed directly to Client Components».
 * به همین دلیل صفحه‌های برندها، دسته‌بندی‌ها و کاربران پنل خطای ۵۰۰
 * می‌دادند.
 *
 * راه‌حل: به‌جای تابع، فقط داده‌ی قابل سریال‌سازی پاس داده می‌شود و خودِ
 * کامپوننت کلاینت دکمه را می‌سازد.
 */
export type TriggerConfig =
  | { kind: "primary"; label: string }
  | { kind: "icon"; label: string };

export function DialogTrigger({ config, onOpen }: { config: TriggerConfig; onOpen: () => void }) {
  if (useReadOnly()) return null;

  if (config.kind === "icon") {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={config.label}
        className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
    >
      {config.label}
    </button>
  );
}
