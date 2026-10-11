"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Field — پوشش مشترک برچسب، توضیح و خطا                                     */
/* -------------------------------------------------------------------------- */

export type FieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-meta font-medium text-[var(--fg-secondary)]"
        >
          {label}
          {required && (
            <span className="text-[var(--danger-text)]" aria-label="الزامی">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-meta text-[var(--danger-text)]" role="alert">
          <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0" fill="currentColor" aria-hidden>
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v5h-1.5v-5Zm0 6.25h1.5v1.5h-1.5v-1.5Z" />
          </svg>
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-[var(--fg-subtle)]">{hint}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  کنترل‌های پایه                                                             */
/* -------------------------------------------------------------------------- */

const controlBase =
  "w-full rounded-md border bg-[var(--bg-inset)] px-3.5 text-sm text-[var(--fg-primary)] " +
  "placeholder:text-[var(--fg-subtle)] outline-none " +
  "transition-[border-color,box-shadow,background-color] duration-200 " +
  "[transition-timing-function:var(--ease-out-expo)] " +
  "hover:border-[var(--border-default)] " +
  "focus:border-[var(--brand)] focus:bg-[var(--bg-elev-2)] " +
  "focus:shadow-[0_0_0_3px_var(--brand-soft)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  /** آیکون داخل فیلد، سمت راست (RTL) */
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, icon, suffix, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        "h-11",
        invalid ? "border-[var(--danger)]" : "border-[var(--border-subtle)]",
        icon && "ps-10",
        suffix && "pe-16",
        className,
      )}
      {...props}
    />
  );

  if (!icon && !suffix) return control;

  return (
    <div className="relative">
      {icon && (
        <span
          className="pointer-events-none absolute inset-y-0 start-0 flex w-10 items-center justify-center text-[var(--fg-subtle)]"
          aria-hidden
        >
          {icon}
        </span>
      )}
      {control}
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3.5 text-xs text-[var(--fg-subtle)]">
          {suffix}
        </span>
      )}
    </div>
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        "resize-y py-3 leading-7",
        invalid ? "border-[var(--danger)]" : "border-[var(--border-subtle)]",
        className,
      )}
      {...props}
    />
  );
});

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          "h-11 cursor-pointer appearance-none pe-10",
          invalid ? "border-[var(--danger)]" : "border-[var(--border-subtle)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute inset-y-0 end-3.5 my-auto size-4 text-[var(--fg-subtle)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Checkbox / Switch                                                          */
/* -------------------------------------------------------------------------- */

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
};

export function Checkbox({ className, label, hint, id, ...props }: CheckboxProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={inputId}
        type="checkbox"
        className="peer sr-only"
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center rounded-sm border",
          "border-[var(--border-default)] bg-[var(--bg-inset)] transition-all duration-200",
          "[transition-timing-function:var(--ease-out-expo)]",
          "peer-checked:border-[var(--brand)] peer-checked:bg-[var(--brand)]",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-ring)] peer-focus-visible:ring-offset-2",
          "peer-focus-visible:ring-offset-[var(--bg-base)]",
          "[&>svg]:scale-0 peer-checked:[&>svg]:scale-100",
        )}
      >
        <svg
          viewBox="0 0 14 14"
          className="size-3 text-[var(--fg-on-brand)] transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
        >
          <path d="m2.5 7.5 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </label>
      {(label || hint) && (
        <label htmlFor={inputId} className="cursor-pointer select-none">
          {label && <span className="block text-sm text-[var(--fg-primary)]">{label}</span>}
          {hint && <span className="mt-0.5 block text-xs text-[var(--fg-subtle)]">{hint}</span>}
        </label>
      )}
    </div>
  );
}

export type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
};

export function Switch({ className, label, hint, id, ...props }: SwitchProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {(label || hint) && (
        <label htmlFor={inputId} className="cursor-pointer select-none">
          {label && <span className="block text-sm text-[var(--fg-primary)]">{label}</span>}
          {hint && <span className="mt-0.5 block text-xs text-[var(--fg-subtle)]">{hint}</span>}
        </label>
      )}
      <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
      <label
        htmlFor={inputId}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-[var(--border-default)]",
          "bg-[var(--bg-inset)] transition-colors duration-300",
          "[transition-timing-function:var(--ease-out-expo)]",
          "peer-checked:border-[var(--brand)] peer-checked:bg-[var(--brand)]",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-ring)] peer-focus-visible:ring-offset-2",
          "peer-focus-visible:ring-offset-[var(--bg-base)]",
          "after:absolute after:top-1/2 after:end-[3px] after:size-4 after:-translate-y-1/2",
          "after:rounded-full after:bg-[var(--fg-muted)] after:transition-all after:duration-300",
          "after:[transition-timing-function:var(--ease-spring)]",
          "peer-checked:after:end-[calc(100%-1.1875rem)] peer-checked:after:bg-[var(--fg-on-brand)]",
        )}
        aria-hidden
      />
    </div>
  );
}
