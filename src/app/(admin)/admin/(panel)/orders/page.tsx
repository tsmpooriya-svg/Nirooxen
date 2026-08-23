import Link from "next/link";

import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import type { OrderStatus, OrderType } from "@/db/schema";
import { ORDER_PRIORITY, ORDER_SOURCE, ORDER_STATUS, ORDER_TYPE } from "@/lib/constants";
import { buildQuery, formatDateTime, formatPrice, formatRelative, toFaDigits } from "@/lib/utils";
import { listOrders } from "@/modules/admin/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const filters = {
    q: first(params.q),
    status: first(params.status) as OrderStatus | undefined,
    type: first(params.type) as OrderType | undefined,
    assignee: first(params.assignee),
    open: first(params.open) === "1",
    page: Math.max(1, Number(first(params.page) ?? 1) || 1),
  };

  const { items, total, page, pageCount } = await listOrders(filters);

  const buildHref = (overrides: Record<string, string | undefined>) =>
    `/admin/orders${buildQuery({
      q: filters.q,
      status: filters.status,
      type: filters.type,
      assignee: filters.assignee,
      open: filters.open ? "1" : undefined,
      ...overrides,
    })}`;

  return (
    <>
      <AdminPageHeader
        title="سفارش‌ها و استعلام‌ها"
        description={`${toFaDigits(total)} پرونده ثبت شده است. برای مشاهده جزئیات و ثبت پیش‌فاکتور روی شماره پرونده کلیک کنید.`}
      />

      {/* فیلترها */}
      <div className="mb-4 space-y-3">
        <form action="/admin/orders" className="flex flex-wrap gap-2">
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="جستجوی شماره پرونده، نام، تلفن یا شرکت…"
            className="h-10 min-w-56 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3.5 text-sm outline-none transition-colors focus:border-[var(--brand)]"
          />
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          {filters.type && <input type="hidden" name="type" value={filters.type} />}
          <button
            type="submit"
            className="h-10 shrink-0 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
          >
            جستجو
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={buildHref({ status: undefined, open: undefined, page: undefined })} active={!filters.status && !filters.open}>
            همه
          </FilterChip>
          <FilterChip href={buildHref({ open: "1", status: undefined, page: undefined })} active={filters.open}>
            نیازمند اقدام
          </FilterChip>
          {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((status) => (
            <FilterChip
              key={status}
              href={buildHref({ status, open: undefined, page: undefined })}
              active={filters.status === status}
            >
              {ORDER_STATUS[status].label}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={buildHref({ type: undefined, page: undefined })} active={!filters.type}>
            هر دو نوع
          </FilterChip>
          <FilterChip href={buildHref({ type: "QUOTE", page: undefined })} active={filters.type === "QUOTE"}>
            استعلام قیمت
          </FilterChip>
          <FilterChip href={buildHref({ type: "ORDER", page: undefined })} active={filters.type === "ORDER"}>
            ثبت سفارش
          </FilterChip>
          <FilterChip href={buildHref({ assignee: "none", page: undefined })} active={filters.assignee === "none"}>
            بدون کارشناس
          </FilterChip>
        </div>
      </div>

      <Panel padded={false}>
        <DataTable
          head={["شماره / اولویت", "مشتری", "نوع و منبع", "وضعیت", "کارشناس", "مبلغ", "ثبت"]}
          empty={items.length === 0}
        >
          {items.map((order) => (
            <Tr key={order.id}>
              <Td>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-mono text-xs font-semibold text-[var(--brand)] transition-opacity hover:opacity-80"
                  dir="ltr"
                >
                  {order.number}
                </Link>
                <span className="mt-1.5 block">
                  <StatusBadge map={ORDER_PRIORITY} value={order.priority} />
                </span>
              </Td>

              <Td>
                <span className="block font-medium">{order.contactName}</span>
                <a
                  href={`tel:${order.contactPhone}`}
                  className="mt-0.5 block font-mono text-[0.6875rem] text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                  dir="ltr"
                >
                  {order.contactPhone}
                </a>
                {order.contactCompany && (
                  <span className="mt-0.5 block text-[0.6875rem] text-[var(--fg-subtle)]">
                    {order.contactCompany}
                  </span>
                )}
              </Td>

              <Td>
                <StatusBadge map={ORDER_TYPE} value={order.type} />
                <span className="mt-1 block text-[0.6875rem] text-[var(--fg-subtle)]">
                  {ORDER_SOURCE[order.source].label} · {toFaDigits(order.itemCount)} قلم
                </span>
              </Td>

              <Td>
                <StatusBadge map={ORDER_STATUS} value={order.status} />
              </Td>

              <Td className="text-xs">
                {order.assigneeName ?? (
                  <span className="text-[var(--warn)]">ارجاع نشده</span>
                )}
              </Td>

              <Td className="whitespace-nowrap text-xs">
                {order.total > 0 ? formatPrice(order.total, { withUnit: false }) : "—"}
              </Td>

              <Td className="whitespace-nowrap">
                <span className="block text-[0.6875rem] text-[var(--fg-secondary)]">
                  {formatRelative(order.createdAt)}
                </span>
                <span className="mt-0.5 block text-[0.625rem] text-[var(--fg-subtle)]">
                  {formatDateTime(order.createdAt)}
                </span>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>

      <Pagination page={page} pageCount={pageCount} buildHref={(n) => buildHref({ page: String(n) })} />
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1.5 text-[0.6875rem] font-medium transition-all duration-200 " +
        (active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
          : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]")
      }
    >
      {children}
    </Link>
  );
}
