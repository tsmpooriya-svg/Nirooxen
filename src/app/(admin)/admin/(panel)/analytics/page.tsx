import Link from "next/link";

import { AdminPageHeader, DataTable, Panel, StatCard, Td, Tr } from "@/components/admin/ui";
import { TrafficChart } from "@/components/admin/traffic-chart";
import { requirePageAccess } from "@/lib/auth";
import { toFaDigits } from "@/lib/utils";
import { getTrafficInsights } from "@/modules/admin/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const dynamic = "force-dynamic";

/** بازه‌های قابل انتخاب — عدد دلخواه از کوئری پذیرفته نمی‌شود */
const RANGES = [7, 30, 90] as const;

const KIND_LABEL: Record<string, string> = {
  home: "صفحهٔ اصلی",
  product: "صفحهٔ محصول",
  catalog: "فهرست محصولات",
  brand: "برند",
  news: "خبر",
  solution: "راهکار",
  quote: "فرم استعلام",
  contact: "تماس",
  page: "سایر صفحه‌ها",
};

/**
 * نام خواندنی یک مسیر.
 *
 * مسیر خام در ستون اصلی بد می‌نشیند: در متن راست‌به‌چپ، «/products/x» به شکل
 * «products/x/» دیده می‌شود، و «/» تنهای صفحهٔ اصلی اصلاً چیزی نمی‌گوید.
 */
function pageLabel(row: { path: string; kind: string; title: string | null }): string {
  if (row.title) return row.title;
  if (row.path === "/") return "صفحهٔ اصلی";
  return KIND_LABEL[row.kind] ?? row.path;
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess("logs");

  const params = await searchParams;
  const asked = Number(Array.isArray(params.days) ? params.days[0] : params.days);
  const days = RANGES.includes(asked as (typeof RANGES)[number]) ? asked : 30;

  const data = await getTrafficInsights(days);

  /*
    نسبت بازدید به بازدیدکننده — «هر نفر چند صفحه دید». عدد خودش کوچک است ولی
    چیزی می‌گوید که دو عدد دیگر نمی‌گویند: کسی که آمده گشته یا همان صفحهٔ اول
    را بسته.
  */
  const perVisitor = data.visitors > 0 ? (data.views / data.visitors).toFixed(1) : "۰";

  return (
    <>
      <AdminPageHeader
        title="آمار بازدید"
        description="از داده‌های خود سایت، بدون سرویس بیرونی و بدون کوکی. هیچ IP ذخیره نمی‌شود."
      />

      <div className="mb-6 flex gap-2">
        {RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/analytics?days=${range}`}
            className={
              range === days
                ? "rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--fg-on-brand)]"
                : "rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--fg-secondary)] hover:bg-[var(--bg-elev-2)]"
            }
          >
            {toFaDigits(range)} روز
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="بازدید صفحه" value={toFaDigits(data.views)} />
        <StatCard
          label="بازدیدکننده"
          value={toFaDigits(data.visitors)}
          hint="مجموع یکتاهای روزانه"
          tone="info"
        />
        <StatCard label="صفحه به ازای هر نفر" value={toFaDigits(perVisitor)} tone="ok" />
        <StatCard
          label="ورود مستقیم"
          value={toFaDigits(Math.max(0, data.direct))}
          hint="بدون ارجاع از سایت دیگر"
          tone="warn"
        />
      </div>

      <Panel title={`روند ${toFaDigits(days)} روز گذشته`} className="mb-6">
        <TrafficChart data={data.daily} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="پربازدیدترین صفحه‌ها" padded={false}>
          <DataTable head={["صفحه", "بازدید", "بازدیدکننده"]} empty={data.pages.length === 0}>
            {data.pages.map((row) => (
              <Tr key={row.path}>
                <Td>
                  {/* نام محصول اگر بود؛ یک نامک به تنهایی به مدیر فروش چیزی نمی‌گوید */}
                  <span className="block text-[var(--fg-primary)]">{pageLabel(row)}</span>
                  {/* مسیر همیشه لاتین است و باید چپ‌به‌راست خوانده شود */}
                  <span
                    className="block text-micro text-[var(--fg-subtle)]"
                    dir="ltr"
                    style={{ textAlign: "start" }}
                  >
                    {row.path}
                  </span>
                </Td>
                <Td>{toFaDigits(row.views)}</Td>
                <Td>{toFaDigits(row.visitors)}</Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>

        <div className="grid gap-4">
          <Panel title="از کجا آمده‌اند" padded={false}>
            <DataTable head={["دامنه", "بازدید"]} empty={data.referrers.length === 0}>
              {data.referrers.map((row) => (
                <Tr key={row.host ?? "?"}>
                  <Td dir="ltr" style={{ textAlign: "start" }}>
                    {row.host}
                  </Td>
                  <Td>{toFaDigits(row.views)}</Td>
                </Tr>
              ))}
            </DataTable>
          </Panel>

          <Panel title="تفکیک نوع صفحه" padded={false}>
            <DataTable head={["نوع", "بازدید"]} empty={data.kinds.length === 0}>
              {data.kinds.map((row) => (
                <Tr key={row.kind}>
                  <Td>{KIND_LABEL[row.kind] ?? row.kind}</Td>
                  <Td>{toFaDigits(row.views)}</Td>
                </Tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      </div>
    </>
  );
}
