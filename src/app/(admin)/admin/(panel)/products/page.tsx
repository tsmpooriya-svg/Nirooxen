import Link from "next/link";

import { ProductRowActions, ProductBulkBar } from "@/components/admin/product-actions";
import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import type { ProductStatus } from "@/db/schema";
import { PRICE_MODE, PRODUCT_STATUS, STOCK_STATUS } from "@/lib/constants";
import { buildQuery, formatPrice, formatRelative, toFaDigits } from "@/lib/utils";
import { getCategoryOptions, listAdminProducts } from "@/modules/admin/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const filters = {
    q: first(params.q),
    status: first(params.status) as ProductStatus | undefined,
    categoryId: first(params.categoryId),
    page: Math.max(1, Number(first(params.page) ?? 1) || 1),
  };

  const [{ items, total, page, pageCount }, categories] = await Promise.all([
    listAdminProducts(filters),
    getCategoryOptions(),
  ]);

  const buildHref = (overrides: Record<string, string | undefined>) =>
    `/admin/products${buildQuery({ ...filters, page: undefined, ...overrides })}`;

  return (
    <>
      <AdminPageHeader
        title="محصولات"
        description={`${toFaDigits(total)} محصول در کاتالوگ ثبت شده است.`}
        actions={
          <Link
            href="/admin/products/new"
            className="flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
            </svg>
            محصول جدید
          </Link>
        }
      />

      <form action="/admin/products" className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="جستجوی نام، کد کالا یا مدل…"
          className="h-10 min-w-56 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3.5 text-sm outline-none focus:border-[var(--brand)]"
        />
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className="h-10 cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-sm outline-none focus:border-[var(--brand)]"
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(PRODUCT_STATUS).map(([key, entry]) => (
            <option key={key} value={key}>
              {entry.label}
            </option>
          ))}
        </select>
        <select
          name="categoryId"
          defaultValue={filters.categoryId ?? ""}
          className="h-10 cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-sm outline-none focus:border-[var(--brand)]"
        >
          <option value="">همه دسته‌بندی‌ها</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.depth > 0 ? `— ${category.name}` : category.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
        >
          اعمال
        </button>
      </form>

      <ProductBulkBar productIds={items.map((p) => p.id)}>
        <Panel padded={false}>
          <DataTable
            head={["", "محصول", "دسته / برند", "قیمت", "موجودی", "وضعیت", "آمار", ""]}
            empty={items.length === 0}
          >
            {items.map((product) => (
              <Tr key={product.id}>
                <Td className="w-10">
                  <input
                    type="checkbox"
                    name="bulk"
                    value={product.id}
                    aria-label={`انتخاب ${product.name}`}
                    className="size-4 accent-[var(--brand)]"
                  />
                </Td>

                <Td>
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="size-11 shrink-0 rounded-md border border-[var(--border-hairline)] object-cover"
                      />
                    ) : (
                      <span className="size-11 shrink-0 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-inset)]" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="block max-w-[18rem] truncate font-medium transition-colors hover:text-[var(--brand)]"
                      >
                        {product.name}
                      </Link>
                      <span className="mt-0.5 block font-mono text-[0.625rem] text-[var(--fg-subtle)]" dir="ltr">
                        {product.sku ?? product.slug}
                      </span>
                    </div>
                  </div>
                </Td>

                <Td className="text-xs">
                  <span className="block">{product.categoryName}</span>
                  <span className="mt-0.5 block text-[0.6875rem] text-[var(--fg-subtle)]">
                    {product.brandName ?? "—"}
                  </span>
                </Td>

                <Td className="whitespace-nowrap text-xs">
                  {product.priceMode === "PUBLIC" && product.price ? (
                    formatPrice(product.price, { withUnit: false })
                  ) : (
                    <span className="text-[var(--fg-subtle)]">{PRICE_MODE[product.priceMode].label}</span>
                  )}
                </Td>

                <Td>
                  <StatusBadge map={STOCK_STATUS} value={product.stockStatus} />
                </Td>

                <Td>
                  <StatusBadge map={PRODUCT_STATUS} value={product.status} />
                  {product.isFeatured && (
                    <span className="mt-1 block text-[0.625rem] text-[var(--signal)]">شاخص</span>
                  )}
                </Td>

                <Td className="whitespace-nowrap font-mono text-[0.625rem] text-[var(--fg-subtle)]">
                  <span className="block">{toFaDigits(product.viewCount)} بازدید</span>
                  <span className="block">{toFaDigits(product.orderCount)} سفارش</span>
                  <span className="mt-1 block">{formatRelative(product.updatedAt)}</span>
                </Td>

                <Td className="w-24">
                  <ProductRowActions productId={product.id} slug={product.slug} name={product.name} />
                </Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>
      </ProductBulkBar>

      <Pagination page={page} pageCount={pageCount} buildHref={(n) => buildHref({ page: String(n) })} />
    </>
  );
}
