import Link from "next/link";

import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { buildQuery, formatDate, formatRelative, toFaDigits } from "@/lib/utils";
import { listCustomers } from "@/modules/admin/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const dynamic = "force-dynamic";
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const TYPE_MAP = {
  INDIVIDUAL: { label: "حقیقی", tone: "neutral" as const },
  COMPANY: { label: "حقوقی", tone: "info" as const },
};

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q);
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);
  const { items, total, pageCount } = await listCustomers({ q, page });

  return (
    <>
      <AdminPageHeader title="مشتریان" description={`${toFaDigits(total)} مشتری در سیستم ثبت شده است.`} />

      <form action="/admin/customers" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="جستجوی نام، شماره تماس یا شرکت…"
          className="h-10 min-w-56 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3.5 text-sm outline-none focus:border-[var(--brand)]"
        />
        <button type="submit" className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] hover:bg-[var(--brand-hover)]">
          جستجو
        </button>
      </form>

      <Panel padded={false}>
        <DataTable head={["مشتری", "تماس", "نوع", "شهر", "درخواست‌ها", "آخرین فعالیت", "عضویت"]} empty={items.length === 0}>
          {items.map((customer) => (
            <Tr key={customer.id}>
              <Td>
                <Link href={`/admin/customers/${customer.id}`} className="font-medium transition-colors hover:text-[var(--brand)]">
                  {customer.fullName}
                </Link>
                {customer.tags.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[0.5625rem] text-[var(--brand)]">
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </Td>
              <Td>
                <a href={`tel:${customer.phone}`} className="block font-mono text-[0.6875rem] transition-colors hover:text-[var(--brand)]" dir="ltr">
                  {customer.phone}
                </a>
                {customer.email && (
                  <span className="mt-0.5 block font-mono text-[0.625rem] text-[var(--fg-subtle)]" dir="ltr">{customer.email}</span>
                )}
              </Td>
              <Td>
                <StatusBadge map={TYPE_MAP} value={customer.type} />
                {customer.companyName && (
                  <span className="mt-1 block text-[0.625rem] text-[var(--fg-subtle)]">{customer.companyName}</span>
                )}
              </Td>
              <Td className="text-xs">{customer.city ?? "—"}</Td>
              <Td className="font-mono text-xs">{toFaDigits(customer.orderCount)}</Td>
              <Td className="text-[0.6875rem] text-[var(--fg-muted)]">
                {customer.lastOrderAt ? formatRelative(customer.lastOrderAt) : "—"}
              </Td>
              <Td className="text-[0.6875rem] text-[var(--fg-subtle)]">{formatDate(customer.createdAt)}</Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>

      <Pagination page={page} pageCount={pageCount} buildHref={(n) => `/admin/customers${buildQuery({ q, page: n === 1 ? undefined : n })}`} />
    </>
  );
}
