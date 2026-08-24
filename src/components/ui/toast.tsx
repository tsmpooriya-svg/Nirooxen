"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast باید داخل <ToastProvider> استفاده شود.");
  return ctx;
}

const toneStyles: Record<ToastTone, { ring: string; icon: React.ReactNode }> = {
  success: {
    ring: "border-[color-mix(in_oklab,var(--ok)_45%,transparent)]",
    icon: (
      <svg viewBox="0 0 20 20" className="size-5 text-[var(--ok-text)]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="10" cy="10" r="8" opacity=".35" />
        <path d="m6.5 10.2 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    ring: "border-[color-mix(in_oklab,var(--danger)_45%,transparent)]",
    icon: (
      <svg viewBox="0 0 20 20" className="size-5 text-[var(--danger-text)]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="10" cy="10" r="8" opacity=".35" />
        <path d="M10 6v5M10 13.5h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    ring: "border-[var(--border-brand)]",
    icon: (
      <svg viewBox="0 0 20 20" className="size-5 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="10" cy="10" r="8" opacity=".35" />
        <path d="M10 9v5M10 6.5h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  warning: {
    ring: "border-[color-mix(in_oklab,var(--warn)_45%,transparent)]",
    icon: (
      <svg viewBox="0 0 20 20" className="size-5 text-[var(--warn-text)]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M10 3.5 18 16.5H2L10 3.5Z" opacity=".35" />
        <path d="M10 8.5v3.5M10 14.5h.01" strokeLinecap="round" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "info" }) => {
      const id = ++counter.current;
      setToasts((current) => [...current.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 5500);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2.5 p-4 sm:items-end sm:p-6"
        role="region"
        aria-live="polite"
        aria-label="اعلان‌ها"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "anim-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border",
              "glass p-4 shadow-[var(--shadow-lg)]",
              toneStyles[item.tone].ring,
            )}
          >
            <span className="mt-0.5 shrink-0">{toneStyles[item.tone].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--fg-primary)]">{item.title}</p>
              {item.description && (
                <p className="mt-1 text-xs leading-6 text-[var(--fg-muted)]">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="بستن اعلان"
              className="shrink-0 rounded-sm p-1 text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg-primary)]"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
