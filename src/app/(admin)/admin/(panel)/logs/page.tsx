import { AdminPageHeader, DataTable, Panel, Td, Tr } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { buildQuery, formatDateTime, formatRelative, toFaDigits } from "@/lib/utils";
import { getSearchInsights, listActivityLogs } from "@/modules/admin/queries";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const dynamic = "force-dynamic";
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const ACTION_LABEL: Record<string, string> = {
  create: "ایجاد", update: "ویرایش", delete: "حذف", status_change: "تغییر وضعیت",
  login: "ورود", login_failed: "ورود ناموفق", logout: "خروج", export: "خروجی", assign: "ارجاع",
};

const ENTITIES = ["order", "product", "category", "brand", "customer", "post", "message", "user", "settings"];

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess("logs");

  const params = await searchParams;
  const entity = first(params.entity);
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);
  const [{ items, total, pageCount }, search] = await Promise.all([
    listActivityLogs({ entity, page }),
    getSearchInsights(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="لاگ فعالیت‌ها"
        description={`${toFaDigits(total)} رویداد ثبت شده است. این فهرست فقط خواندنی است و قابل ویرایش نیست.`}
      />

      {/*
        جست‌وجوهای بازدیدکنندگان. ستون راست فقط می‌گوید مردم دنبال چه می‌گردند؛
        ستون چپ می‌گوید دنبال چه گشته‌اند و چیزی پیدا نکرده‌اند — و آن یکی
        فهرست کارِ بعدی است: یا کالا را نداریم، یا نامش با زبان مشتری نمی‌خواند.
      */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Panel
          title="پرجست‌وجوترین عبارت‌ها"
          action={
            <span className="text-micro text-[var(--fg-subtle)]">
              {toFaDigits(search.total)} جست‌وجو در {toFaDigits(search.days)} روز گذشته
            </span>
          }
          padded={false}
        >
          <DataTable head={["عبارت", "دفعات", "میانگین نتایج", "آخرین بار"]} empty={search.top.length === 0}>
            {search.top.map((row) => (
              <Tr key={row.term}>
                <Td className="font-medium">{row.term}</Td>
                <Td className="font-mono text-xs">{toFaDigits(row.hits)}</Td>
                <Td className="font-mono text-xs text-[var(--fg-muted)]">{toFaDigits(row.avgResults ?? 0)}</Td>
                <Td className="text-micro text-[var(--fg-subtle)]">{formatRelative(row.lastAt)}</Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>

        <Panel
          title="جست‌وجوهای بی‌نتیجه"
          action={
            <span className="text-micro text-[var(--fg-subtle)]">هیچ کالایی پیدا نشد</span>
          }
          padded={false}
        >
          <DataTable head={["عبارت", "دفعات", "آخرین بار"]} empty={search.empty.length === 0}>
            {search.empty.map((row) => (
              <Tr key={row.term}>
                <Td className="font-medium text-[var(--danger-text)]">{row.term}</Td>
                <Td className="font-mono text-xs">{toFaDigits(row.hits)}</Td>
                <Td className="text-micro text-[var(--fg-subtle)]">{formatRelative(row.lastAt)}</Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip href="/admin/logs" active={!entity}>همه</Chip>
        {ENTITIES.map((item) => (
          <Chip key={item} href={`/admin/logs?entity=${item}`} active={entity === item}>
            {item}
          </Chip>
        ))}
      </div>

      <Panel padded={false}>
        <DataTable head={["عملیات", "شرح", "کاربر", "IP", "زمان"]} empty={items.length === 0}>
          {items.map((log) => (
            <Tr key={log.id}>
              <Td>
                <span className="rounded-full bg-[var(--bg-elev-3)] px-2.5 py-1 text-micro text-[var(--fg-secondary)]">
                  {ACTION_LABEL[log.action] ?? log.action}
                </span>
                <span className="mt-1 block font-mono text-label text-[var(--fg-subtle)]">{log.entity}</span>
              </Td>
              <Td className="text-meta">{log.summary}</Td>
              <Td className="text-xs">{log.userName ?? "سیستم"}</Td>
              <Td className="font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">{log.ip ?? "—"}</Td>
              <Td className="whitespace-nowrap">
                <span className="block text-micro text-[var(--fg-secondary)]">{formatRelative(log.createdAt)}</span>
                <span className="mt-0.5 block text-micro text-[var(--fg-subtle)]">{formatDateTime(log.createdAt)}</span>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>

      <Pagination page={page} pageCount={pageCount} buildHref={(n) => `/admin/logs${buildQuery({ entity, page: n === 1 ? undefined : n })}`} />
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1.5 font-mono text-micro transition-all " +
        (active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
          : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]")
      }
    >
      {children}
    </Link>
  );
}
