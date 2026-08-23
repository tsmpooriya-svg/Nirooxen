import Link from "next/link";

import { AdminPageHeader, DataTable, EmptyState, Panel, StatCard, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { ORDER_PRIORITY, ORDER_STATUS, ORDER_TYPE } from "@/lib/constants";
import { formatPrice, formatRelative, toFaDigits } from "@/lib/utils";
import { getDashboardData } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

const icon = (d: string) => (
  <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function DashboardPage() {
  const { stats, recentOrders, statusBreakdown, dailyTrend, topProducts, recentActivity } =
    await getDashboardData();

  const maxTrend = Math.max(1, ...dailyTrend.map((d) => d.total));
  const totalForBreakdown = Math.max(1, statusBreakdown.reduce((sum, s) => sum + s.total, 0));

  return (
    <>
      <AdminPageHeader
        title="داشبورد"
        description="نمای کلی وضعیت فروش، درخواست‌های باز و فعالیت‌های اخیر سیستم."
      />

      {/* آمار کلیدی */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="درخواست‌های در انتظار اقدام"
          value={stats.openOrders}
          hint="سفارش‌ها و استعلام‌هایی که منتظر پیگیری شما هستند"
          tone={stats.openOrders > 0 ? "warn" : "ok"}
          href="/admin/orders?open=1"
          icon={icon("M4 3h9l3 3v11H4zM7 8h6M7 11.5h6")}
        />
        <StatCard
          label="درخواست ۳۰ روز اخیر"
          value={stats.quotesLast30}
          hint={`${toFaDigits(stats.completedLast30)} مورد تکمیل شده`}
          tone="brand"
          href="/admin/orders"
          icon={icon("M3 15l4-5 3 3 4-6 3 4")}
        />
        <StatCard
          label="مشتریان"
          value={stats.totalCustomers}
          hint={`${toFaDigits(stats.newCustomers7)} مشتری جدید در هفته اخیر`}
          tone="info"
          href="/admin/customers"
          icon={icon("M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 17c0-3 2.7-5 6-5s6 2 6 5")}
        />
        <StatCard
          label="محصولات منتشرشده"
          value={stats.publishedProducts}
          hint={`${toFaDigits(stats.draftProducts)} پیش‌نویس منتشرنشده`}
          tone={stats.draftProducts > 0 ? "warn" : "ok"}
          href="/admin/products"
          icon={icon("M10 2.5 17 6v8l-7 3.5L3 14V6zM3 6l7 3.5L17 6")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* آخرین درخواست‌ها */}
        <Panel
          title="آخرین درخواست‌ها"
          padded={false}
          action={
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-[var(--brand)] transition-opacity hover:opacity-80"
            >
              مشاهده همه
            </Link>
          }
        >
          <DataTable
            head={["شماره", "مشتری", "نوع", "وضعیت", "مبلغ", "زمان"]}
            empty={recentOrders.length === 0}
          >
            {recentOrders.map((order) => (
              <Tr key={order.id}>
                <Td>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs font-medium text-[var(--brand)] transition-opacity hover:opacity-80"
                    dir="ltr"
                  >
                    {order.number}
                  </Link>
                  {order.priority !== "NORMAL" && (
                    <span className="mt-1 block">
                      <StatusBadge map={ORDER_PRIORITY} value={order.priority} />
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="block font-medium">{order.contactName}</span>
                  <span className="mt-0.5 block font-mono text-[0.6875rem] text-[var(--fg-subtle)]" dir="ltr">
                    {order.contactPhone}
                  </span>
                </Td>
                <Td>
                  <StatusBadge map={ORDER_TYPE} value={order.type} />
                  <span className="mt-1 block text-[0.6875rem] text-[var(--fg-subtle)]">
                    {toFaDigits(order.itemCount)} قلم
                  </span>
                </Td>
                <Td>
                  <StatusBadge map={ORDER_STATUS} value={order.status} />
                </Td>
                <Td className="whitespace-nowrap text-xs">
                  {order.total > 0 ? formatPrice(order.total, { withUnit: false }) : "—"}
                </Td>
                <Td className="whitespace-nowrap text-[0.6875rem] text-[var(--fg-subtle)]">
                  {formatRelative(order.createdAt)}
                </Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>

        <div className="space-y-4">
          {/* روند ۱۴ روزه */}
          <Panel title="روند درخواست‌ها (۱۴ روز)">
            {dailyTrend.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--fg-subtle)]">داده‌ای ثبت نشده است.</p>
            ) : (
              <div className="flex h-32 items-end gap-1.5" role="img" aria-label="نمودار روند درخواست‌ها">
                {dailyTrend.map((day) => (
                  <div key={day.day} className="group relative flex flex-1 flex-col items-center gap-1.5">
                    <span
                      className="w-full rounded-t-sm bg-[var(--brand)] transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:bg-[var(--brand-hover)]"
                      style={{ height: `${Math.max(6, (day.total / maxTrend) * 100)}%`, opacity: 0.55 + (day.total / maxTrend) * 0.45 }}
                    />
                    <span className="font-mono text-[0.5625rem] text-[var(--fg-subtle)]">
                      {toFaDigits(day.total)}
                    </span>
                    <span className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-sm bg-[var(--bg-elev-3)] px-2 py-1 font-mono text-[0.5625rem] text-[var(--fg-secondary)] group-hover:block">
                      {day.day}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* توزیع وضعیت */}
          <Panel title="توزیع وضعیت پرونده‌ها">
            <ul className="space-y-2.5">
              {statusBreakdown
                .sort((a, b) => b.total - a.total)
                .map((row) => {
                  const percent = Math.round((row.total / totalForBreakdown) * 100);
                  return (
                    <li key={row.status}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <StatusBadge map={ORDER_STATUS} value={row.status} />
                        <span className="font-mono text-[var(--fg-muted)]">
                          {toFaDigits(row.total)} · {toFaDigits(percent)}٪
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-inset)]">
                        <div
                          className="h-full rounded-full bg-[var(--brand)] transition-all duration-700 [transition-timing-function:var(--ease-out-expo)]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* پرتقاضاترین محصولات */}
        <Panel title="پرتقاضاترین محصولات" padded={false}>
          {topProducts.length === 0 ? (
            <EmptyState title="هنوز داده‌ای نیست" description="پس از ثبت چند سفارش، این فهرست پر می‌شود." />
          ) : (
            <ul className="divide-y divide-[var(--border-hairline)]">
              {topProducts.map((product, index) => (
                <li key={product.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--brand-soft)] font-mono text-[0.6875rem] font-bold text-[var(--brand)]">
                    {toFaDigits(index + 1)}
                  </span>
                  <Link
                    href={`/products/${product.slug}`}
                    target="_blank"
                    className="min-w-0 flex-1 truncate text-[0.8125rem] transition-colors hover:text-[var(--brand)]"
                  >
                    {product.name}
                  </Link>
                  <span className="shrink-0 font-mono text-[0.6875rem] text-[var(--fg-subtle)]">
                    {toFaDigits(product.orderCount)} سفارش · {toFaDigits(product.viewCount)} بازدید
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* فعالیت‌های اخیر */}
        <Panel
          title="فعالیت‌های اخیر"
          padded={false}
          action={
            <Link href="/admin/logs" className="text-xs font-medium text-[var(--brand)] hover:opacity-80">
              همه لاگ‌ها
            </Link>
          }
        >
          {recentActivity.length === 0 ? (
            <EmptyState title="فعالیتی ثبت نشده" />
          ) : (
            <ul className="divide-y divide-[var(--border-hairline)]">
              {recentActivity.map((log) => (
                <li key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] leading-6">{log.summary}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-[var(--fg-subtle)]">
                      {log.userName ?? "سیستم"} · {formatRelative(log.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
