import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AssigneePicker,
  CustomerHistory,
  OrderTimeline,
  OrderWorkflow,
  QuoteBuilder,
} from "@/components/admin/order-workspace";
import { AdminPageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { ORDER_SOURCE, ORDER_STATUS, ORDER_TYPE, PAYMENT_STATUS } from "@/lib/constants";
import { formatDateTime, formatPrice, toFaDigits } from "@/lib/utils";
import { getOrderById, getStaffList } from "@/modules/admin/queries";
import { requirePageAccess } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Params }) {
  await requirePageAccess("orders");

  const { id } = await params;
  const data = await getOrderById(id);
  if (!data) notFound();

  const { order, assigneeName, customerTags, items, events, customerHistory } = data;
  const staff = await getStaffList();

  return (
    <>
      <AdminPageHeader
        breadcrumb={[
          { label: "پنل", href: "/admin" },
          { label: "سفارش‌ها", href: "/admin/orders" },
        ]}
        title={`پرونده ${order.number}`}
        description={`${ORDER_TYPE[order.type].label} · ثبت‌شده در ${formatDateTime(order.createdAt)} از ${ORDER_SOURCE[order.source].label}`}
        actions={
          <>
            <a
              href={`tel:${order.contactPhone}`}
              className="flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M3 2.5h2.5l1 3-1.6 1a8 8 0 0 0 3.6 3.6l1-1.6 3 1V13a1 1 0 0 1-1.1 1A11 11 0 0 1 2 3.6 1 1 0 0 1 3 2.5Z" />
              </svg>
              تماس با مشتری
            </a>
            <Link
              href="/admin/orders"
              className="flex h-10 items-center rounded-md border border-[var(--border-subtle)] px-4 text-sm transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
            >
              بازگشت
            </Link>
          </>
        }
      />

      <div className="mb-4">
        <OrderWorkflow orderId={order.id} status={order.status} priority={order.priority} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem] xl:items-start">
        <div className="space-y-4">
          {/* اقلام */}
          <Panel title={`اقلام درخواست (${toFaDigits(items.length)})`} padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-meta">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elev-2)] text-micro text-[var(--fg-muted)]">
                    <th scope="col" className="px-4 py-3 text-start">محصول</th>
                    <th scope="col" className="px-4 py-3 text-start">تعداد</th>
                    <th scope="col" className="px-4 py-3 text-start">قیمت سایت</th>
                    <th scope="col" className="px-4 py-3 text-start">قیمت اعلامی</th>
                    <th scope="col" className="px-4 py-3 text-start">جمع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3.5">
                        {item.productSlug ? (
                          <Link
                            href={`/products/${item.productSlug}`}
                            target="_blank"
                            className="font-medium transition-colors hover:text-[var(--brand)]"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          <span className="font-medium">{item.productName}</span>
                        )}
                        {item.productSku && (
                          <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">
                            {item.productSku}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs">
                        {toFaDigits(item.quantity)} {item.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[var(--fg-muted)]">
                        {item.unitPrice ? formatPrice(item.unitPrice, { withUnit: false }) : "استعلامی"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        {item.quotedUnitPrice ? (
                          <span className="text-[var(--brand)]">
                            {formatPrice(item.quotedUnitPrice, { withUnit: false })}
                          </span>
                        ) : (
                          <span className="text-[var(--fg-subtle)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs">
                        {item.lineTotal ? formatPrice(item.lineTotal, { withUnit: false }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.total > 0 && (
              <div className="space-y-1.5 border-t border-[var(--border-hairline)] bg-[var(--bg-elev-2)] px-5 py-4 text-xs">
                <SummaryRow label="جمع اقلام" value={formatPrice(order.subtotal)} />
                {order.discount > 0 && <SummaryRow label="تخفیف" value={`− ${formatPrice(order.discount)}`} />}
                {order.tax > 0 && <SummaryRow label="مالیات" value={`+ ${formatPrice(order.tax)}`} />}
                {order.shipping > 0 && <SummaryRow label="حمل" value={`+ ${formatPrice(order.shipping)}`} />}
                <div className="flex items-center justify-between border-t border-[var(--border-hairline)] pt-2.5">
                  <span className="font-medium text-[var(--fg-secondary)]">مبلغ نهایی</span>
                  <span className="font-display text-base font-bold text-[var(--brand)]">
                    {formatPrice(order.total)}
                  </span>
                </div>
                {order.quoteValidUntil && (
                  <p className="pt-1 text-micro text-[var(--fg-subtle)]">
                    اعتبار پیش‌فاکتور تا {formatDateTime(order.quoteValidUntil)}
                  </p>
                )}
              </div>
            )}
          </Panel>

          {/* یادداشت مشتری */}
          {order.note && (
            <Panel title="توضیحات مشتری">
              <p className="whitespace-pre-line text-meta leading-8 text-[var(--fg-secondary)]">
                {order.note}
              </p>
            </Panel>
          )}

          {/* خط زمانی */}
          <Panel title="گردش‌کار و یادداشت‌ها">
            <OrderTimeline orderId={order.id} events={events} />
          </Panel>
        </div>

        {/* ستون کناری */}
        <aside className="space-y-4">
          <Panel title="اقدام سریع">
            <div className="space-y-3">
              <QuoteBuilder orderId={order.id} items={items} />
              <AssigneePicker orderId={order.id} currentId={order.assignedToId} staff={staff} />
            </div>
          </Panel>

          <Panel title="اطلاعات تماس">
            <dl className="space-y-3 text-meta">
              <Info label="نام" value={order.contactName} />
              <Info label="تلفن" value={order.contactPhone} mono href={`tel:${order.contactPhone}`} />
              {order.contactEmail && (
                <Info label="ایمیل" value={order.contactEmail} mono href={`mailto:${order.contactEmail}`} />
              )}
              {order.contactCompany && <Info label="شرکت" value={order.contactCompany} />}
              {order.contactCity && <Info label="شهر" value={order.contactCity} />}
              {customerTags && customerTags.length > 0 && (
                <div>
                  <dt className="mb-1.5 text-micro text-[var(--fg-subtle)]">برچسب‌های مشتری</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {customerTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-micro text-[var(--brand)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {order.customerId && (
                <Link
                  href={`/admin/customers/${order.customerId}`}
                  className="block pt-1 text-xs font-medium text-[var(--brand)] hover:opacity-80"
                >
                  مشاهده پرونده کامل مشتری ←
                </Link>
              )}
            </dl>
          </Panel>

          <Panel title="خلاصه پرونده">
            <dl className="space-y-3 text-meta">
              <div className="flex items-center justify-between">
                <dt className="text-micro text-[var(--fg-subtle)]">نوع</dt>
                <dd><StatusBadge map={ORDER_TYPE} value={order.type} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-micro text-[var(--fg-subtle)]">وضعیت</dt>
                <dd><StatusBadge map={ORDER_STATUS} value={order.status} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-micro text-[var(--fg-subtle)]">پرداخت</dt>
                <dd><StatusBadge map={PAYMENT_STATUS} value={order.paymentStatus} /></dd>
              </div>
              <Info label="کارشناس" value={assigneeName ?? "ارجاع نشده"} />
              <Info label="منبع" value={ORDER_SOURCE[order.source].label} />
              {order.quotedAt && <Info label="زمان اعلام قیمت" value={formatDateTime(order.quotedAt)} />}
              {order.ip && <Info label="IP ثبت‌کننده" value={order.ip} mono />}
            </dl>
          </Panel>

          <Panel title="سابقه این مشتری">
            <CustomerHistory history={customerHistory} />
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Info({
  label,
  value,
  mono,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  const content = (
    <span className={mono ? "font-mono text-xs" : "text-meta"} dir={mono ? "ltr" : undefined}>
      {value}
    </span>
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-micro text-[var(--fg-subtle)]">{label}</dt>
      <dd className="min-w-0 truncate text-end text-[var(--fg-secondary)]">
        {href ? (
          <a href={href} className="transition-colors hover:text-[var(--brand)]">
            {content}
          </a>
        ) : (
          content
        )}
      </dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--fg-muted)]">{label}</span>
      <span className="font-mono text-[var(--fg-secondary)]">{value}</span>
    </div>
  );
}
