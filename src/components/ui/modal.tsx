"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** بستن با کلیک روی پس‌زمینه */
  dismissible?: boolean;
};

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
} as const;

/**
 * دیالوگ مبتنی بر <dialog> بومی مرورگر:
 * فوکوس‌تراپ، بستن با Esc و لایه top-layer را رایگان می‌دهد.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  dismissible = true,
}: ModalProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      onClick={(event) => {
        if (!dismissible) return;
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-default)]",
        "bg-[var(--bg-elev-1)] p-0 text-[var(--fg-primary)] shadow-[var(--shadow-xl)]",
        "backdrop:bg-[var(--bg-scrim)] backdrop:backdrop-blur-sm",
        "open:anim-pop",
        sizes[size],
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        {(title || description) && (
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] px-6 py-5">
            <div>
              {title && (
                <h2 id={titleId} className="text-lg font-semibold">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="grid size-8 shrink-0 place-items-center rounded-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elev-3)] hover:text-[var(--fg-primary)]"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
              </svg>
            </button>
          </header>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-3 border-t border-[var(--border-hairline)] px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}

/** دیالوگ تأیید — برای عملیات مخرب مثل حذف */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "از انجام این کار مطمئن هستید؟",
  description,
  confirmLabel = "بله، انجام بده",
  cancelLabel = "انصراف",
  tone = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "brand";
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-[var(--border-default)] px-4 text-sm transition-colors hover:bg-[var(--bg-elev-3)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "h-10 rounded-md px-4 text-sm font-medium text-white transition-all disabled:opacity-50",
              tone === "danger"
                ? "bg-[var(--danger)] hover:brightness-110"
                : "bg-[var(--brand)] text-[var(--fg-on-brand)] hover:bg-[var(--brand-hover)]",
            )}
          >
            {loading ? "در حال انجام…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-7 text-[var(--fg-secondary)]">
        این عملیات قابل بازگشت نیست. لطفاً پیش از تأیید مطمئن شوید.
      </p>
    </Modal>
  );
}
