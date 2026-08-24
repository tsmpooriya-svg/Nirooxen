"use client";

import Link from "next/link";
import * as React from "react";
import { useTransition } from "react";

import { StatusBadge } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { OrderPriority, OrderStatus } from "@/db/schema";
import { ORDER_PRIORITY, ORDER_STATUS, ORDER_STATUS_FLOW } from "@/lib/constants";
import { cn, formatPrice, formatRelative, toEnDigits, toFaDigits } from "@/lib/utils";
import {
  addOrderNote,
  assignOrder,
  logOrderContact,
  submitQuote,
  updateOrderPriority,
  updateOrderStatus,
} from "@/modules/admin/actions";

type Item = {
  id: string;
  productName: string;
  productSku: string | null;
  productSlug: string | null;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  quotedUnitPrice: number | null;
  lineTotal: number | null;
};

/* -------------------------------------------------------------------------- */
/*  نوار گردش‌کار                                                              */
/* -------------------------------------------------------------------------- */

export function OrderWorkflow({
  orderId,
  status,
  priority,
}: {
  orderId: string;
  status: OrderStatus;
  priority: OrderPriority;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);

  function run(fn: () => Promise<{ status: string; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      toast({
        title: result.status === "success" ? "انجام شد" : "خطا",
        description: result.message,
        tone: result.status === "success" ? "success" : "error",
      });
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-5">
      {/* مراحل */}
      <ol className="mb-6 flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
        {ORDER_STATUS_FLOW.map((step, index) => {
          const done = currentIndex >= 0 && index <= currentIndex;
          const active = step === status;
          return (
            <li key={step} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => updateOrderStatus(orderId, step))}
                title={ORDER_STATUS[step].description}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.6875rem] font-medium transition-all duration-300",
                  "[transition-timing-function:var(--ease-out-expo)] disabled:opacity-50",
                  active
                    ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--fg-on-brand)]"
                    : done
                      ? "border-[var(--border-brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]",
                )}
              >
                {ORDER_STATUS[step].label}
              </button>
              {index < ORDER_STATUS_FLOW.length - 1 && (
                <span
                  className={cn("h-px w-4 shrink-0", done ? "bg-[var(--brand)]" : "bg-[var(--border-subtle)]")}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border-hairline)] pt-4">
        {/* اولویت */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--fg-muted)]">اولویت:</span>
          <div className="flex gap-1">
            {(Object.keys(ORDER_PRIORITY) as OrderPriority[]).map((level) => (
              <button
                key={level}
                type="button"
                disabled={pending}
                onClick={() => run(() => updateOrderPriority(orderId, level))}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[0.6875rem] transition-all duration-200 disabled:opacity-50",
                  priority === level
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)]",
                )}
              >
                {ORDER_PRIORITY[level].label}
              </button>
            ))}
          </div>
        </div>

        {/* وضعیت‌های پایانی */}
        <div className="ms-auto flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => updateOrderStatus(orderId, "CANCELLED"))}
            className="rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-[0.6875rem] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--fg-primary)] disabled:opacity-50"
          >
            لغو پرونده
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => updateOrderStatus(orderId, "REJECTED"))}
            className="rounded-md border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] px-3 py-1.5 text-[0.6875rem] text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)] disabled:opacity-50"
          >
            رد / اسپم
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ارجاع به کارشناس                                                           */
/* -------------------------------------------------------------------------- */

export function AssigneePicker({
  orderId,
  currentId,
  staff,
}: {
  orderId: string;
  currentId: string | null;
  staff: { id: string; name: string }[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <label className="block">
      <span className="mb-2 block text-[0.6875rem] text-[var(--fg-muted)]">کارشناس مسئول</span>
      <select
        defaultValue={currentId ?? ""}
        disabled={pending}
        onChange={(event) => {
          const value = event.target.value || null;
          startTransition(async () => {
            const result = await assignOrder(orderId, value);
            toast({
              title: result.status === "success" ? "ارجاع ثبت شد" : "خطا",
              description: result.message,
              tone: result.status === "success" ? "success" : "error",
            });
          });
        }}
        className="h-10 w-full cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-sm outline-none transition-colors focus:border-[var(--brand)] disabled:opacity-50"
      >
        <option value="">— ارجاع نشده —</option>
        {staff.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  فرم پیش‌فاکتور                                                             */
/* -------------------------------------------------------------------------- */

export function QuoteBuilder({ orderId, items }: { orderId: string; items: Item[] }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const [prices, setPrices] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, String(i.quotedUnitPrice ?? i.unitPrice ?? "")])),
  );
  const [discount, setDiscount] = React.useState("0");
  const [tax, setTax] = React.useState("0");
  const [shipping, setShipping] = React.useState("0");
  const [validDays, setValidDays] = React.useState("7");

  const num = (v: string) => Number(toEnDigits(v).replace(/[^\d]/g, "")) || 0;

  const subtotal = items.reduce((sum, item) => sum + num(prices[item.id] ?? "") * item.quantity, 0);
  const total = Math.max(0, subtotal - num(discount) + num(tax) + num(shipping));

  function save() {
    startTransition(async () => {
      const result = await submitQuote(
        orderId,
        items.map((item) => ({ itemId: item.id, price: num(prices[item.id] ?? "") })),
        {
          discount: num(discount),
          tax: num(tax),
          shipping: num(shipping),
          validDays: Number(toEnDigits(validDays)) || 7,
        },
      );
      toast({
        title: result.status === "success" ? "پیش‌فاکتور ثبت شد" : "خطا",
        description: result.message,
        tone: result.status === "success" ? "success" : "error",
      });
      if (result.status === "success") setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--brand)] text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M3 2h7l3 3v9H3zM6 7h4M6 10h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        ثبت قیمت و صدور پیش‌فاکتور
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="صدور پیش‌فاکتور"
        description="قیمت واحد هر قلم را وارد کنید. با ثبت، وضعیت پرونده به «قیمت اعلام شد» تغییر می‌کند."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-md border border-[var(--border-default)] px-4 text-sm transition-colors hover:bg-[var(--bg-elev-3)]"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {pending ? "در حال ثبت…" : "ثبت پیش‌فاکتور"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev-2)] p-3.5"
              >
                <div className="min-w-[12rem] flex-1">
                  <p className="text-[0.8125rem] font-medium">{item.productName}</p>
                  <p className="mt-0.5 font-mono text-[0.625rem] text-[var(--fg-subtle)]" dir="ltr">
                    {item.productSku ?? "—"} × {toFaDigits(item.quantity)} {item.unit}
                  </p>
                </div>

                <label className="flex items-center gap-2">
                  <span className="text-[0.6875rem] text-[var(--fg-muted)]">قیمت واحد</span>
                  <input
                    value={prices[item.id] ?? ""}
                    onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                    inputMode="numeric"
                    dir="ltr"
                    className="h-9 w-36 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-start font-mono text-xs outline-none focus:border-[var(--brand)]"
                    placeholder="0"
                  />
                </label>

                <span className="w-32 shrink-0 text-end font-mono text-xs text-[var(--fg-secondary)]">
                  {formatPrice(num(prices[item.id] ?? "") * item.quantity, { withUnit: false })}
                </span>
              </li>
            ))}
          </ul>

          <div className="grid gap-3 sm:grid-cols-4">
            <NumberField label="تخفیف (تومان)" value={discount} onChange={setDiscount} />
            <NumberField label="مالیات (تومان)" value={tax} onChange={setTax} />
            <NumberField label="حمل (تومان)" value={shipping} onChange={setShipping} />
            <NumberField label="اعتبار (روز)" value={validDays} onChange={setValidDays} />
          </div>

          <div className="space-y-1.5 rounded-lg border border-[var(--border-brand)] bg-[var(--brand-soft)] p-4 text-sm">
            <Row label="جمع اقلام" value={formatPrice(subtotal)} />
            {num(discount) > 0 && <Row label="تخفیف" value={`− ${formatPrice(num(discount))}`} />}
            {num(tax) > 0 && <Row label="مالیات" value={`+ ${formatPrice(num(tax))}`} />}
            {num(shipping) > 0 && <Row label="حمل" value={`+ ${formatPrice(num(shipping))}`} />}
            <div className="mt-2 flex items-center justify-between border-t border-[var(--border-hairline)] pt-2.5">
              <span className="font-medium">مبلغ نهایی</span>
              <span className="font-display text-base font-bold text-[var(--brand)]">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.6875rem] text-[var(--fg-muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        dir="ltr"
        className="h-10 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-start font-mono text-xs outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--fg-muted)]">{label}</span>
      <span className="font-mono text-[var(--fg-secondary)]">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  خط زمانی و یادداشت                                                          */
/* -------------------------------------------------------------------------- */

export function OrderTimeline({
  orderId,
  events,
}: {
  orderId: string;
  events: { id: string; type: string; message: string; createdAt: Date; userName: string | null }[];
}) {
  const { toast } = useToast();
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = useTransition();

  function submit(kind: "note" | "contact") {
    if (note.trim().length < 2) return;
    startTransition(async () => {
      const result = kind === "note" ? await addOrderNote(orderId, note) : await logOrderContact(orderId, note);
      toast({
        title: result.status === "success" ? "ثبت شد" : "خطا",
        description: result.message,
        tone: result.status === "success" ? "success" : "error",
      });
      if (result.status === "success") setNote("");
    });
  }

  return (
    <div>
      <div className="mb-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4">
        <label htmlFor="order-note" className="mb-2 block text-[0.75rem] font-medium text-[var(--fg-secondary)]">
          ثبت یادداشت یا نتیجه تماس
        </label>
        <textarea
          id="order-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="مثلاً: با مشتری تماس گرفته شد، درخواست ارسال پیش‌فاکتور رسمی دارد."
          className="w-full resize-y rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-3 text-[0.8125rem] leading-7 outline-none transition-colors focus:border-[var(--brand)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || note.trim().length < 2}
            onClick={() => submit("contact")}
            className="h-9 rounded-md bg-[var(--brand)] px-4 text-xs font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-40"
          >
            ثبت تماس
          </button>
          <button
            type="button"
            disabled={pending || note.trim().length < 2}
            onClick={() => submit("note")}
            className="h-9 rounded-md border border-[var(--border-default)] px-4 text-xs transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)] disabled:opacity-40"
          >
            ثبت یادداشت داخلی
          </button>
        </div>
      </div>

      <ol className="relative space-y-4 ps-6">
        <span className="absolute inset-y-2 start-[7px] w-px bg-[var(--border-subtle)]" aria-hidden />
        {events.map((event) => (
          <li key={event.id} className="relative">
            <span
              className={cn(
                "absolute -start-6 top-1.5 size-3.5 rounded-full border-2 border-[var(--bg-elev-1)]",
                event.type === "STATUS_CHANGED"
                  ? "bg-[var(--brand)]"
                  : event.type === "QUOTE_SENT"
                    ? "bg-[var(--ok)]"
                    : event.type === "CONTACTED"
                      ? "bg-[var(--signal)]"
                      : "bg-[var(--fg-subtle)]",
              )}
              aria-hidden
            />
            <p className="text-[0.8125rem] leading-7 text-[var(--fg-secondary)]">{event.message}</p>
            <p className="mt-0.5 text-[0.6875rem] text-[var(--fg-subtle)]">
              {event.userName ?? "سیستم"} · {formatRelative(event.createdAt)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  سابقه مشتری                                                                 */
/* -------------------------------------------------------------------------- */

export function CustomerHistory({
  history,
}: {
  history: { id: string; number: string; status: OrderStatus; total: number; createdAt: Date }[];
}) {
  if (history.length === 0) {
    return <p className="text-xs text-[var(--fg-subtle)]">این اولین درخواست ثبت‌شده توسط این مشتری است.</p>;
  }

  return (
    <ul className="space-y-2">
      {history.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/orders/${item.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-hairline)] p-2.5 transition-colors hover:border-[var(--border-brand)]"
          >
            <span className="font-mono text-[0.6875rem] text-[var(--brand)]" dir="ltr">
              {item.number}
            </span>
            <StatusBadge map={ORDER_STATUS} value={item.status} />
            <span className="font-mono text-[0.625rem] text-[var(--fg-subtle)]">
              {formatRelative(item.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { Badge };
