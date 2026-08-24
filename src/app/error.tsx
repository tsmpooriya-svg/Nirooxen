"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] خطای غیرمنتظره:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 grid size-16 place-items-center rounded-full border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[var(--danger-soft)]">
        <svg viewBox="0 0 24 24" className="size-7 text-[var(--danger-text)]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 8v5M12 16.5h.01" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>

      <h1 className="font-display text-xl font-bold">خطایی رخ داد</h1>
      <p className="mt-4 max-w-md text-sm leading-8 text-[var(--fg-muted)]">
        مشکلی در نمایش این بخش پیش آمد. می‌توانید دوباره تلاش کنید؛ اگر تکرار شد با ما تماس بگیرید.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-[0.6875rem] text-[var(--fg-subtle)]">کد خطا: {error.digest}</p>
      )}

      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
      >
        تلاش دوباره
      </button>
    </div>
  );
}
