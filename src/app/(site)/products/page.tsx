import type { Metadata } from "next";
import { Suspense } from "react";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { ProductCard } from "@/components/site/product-card";
import { ProductFilters, ProductToolbar } from "@/components/site/product-filters";
import { Pagination } from "@/components/ui/pagination";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import type { StockStatus } from "@/db/schema";
import type { SortOption } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";
import { buildQuery } from "@/lib/utils";
import {
  getBrandBySlug,
  getBrands,
  getCategoryBySlug,
  getCategoryTree,
  getPriceRange,
  listProducts,
} from "@/modules/catalog/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = first(params.category);
  const brandSlug = first(params.brand);
  const q = first(params.q);

  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    if (category) {
      return pageMetadata({
        title: category.metaTitle ?? `${category.name} — خرید و استعلام قیمت`,
        description: category.metaDescription ?? category.description ?? undefined,
        path: `/products?category=${category.slug}`,
      });
    }
  }

  if (brandSlug) {
    const brand = await getBrandBySlug(brandSlug);
    if (brand) {
      return pageMetadata({
        title: `محصولات ${brand.name}`,
        description: brand.description ?? undefined,
        path: `/products?brand=${brand.slug}`,
      });
    }
  }

  if (q) {
    return pageMetadata({
      title: `جستجو: ${q}`,
      path: `/products?q=${encodeURIComponent(q)}`,
      noIndex: true,
    });
  }

  return pageMetadata({
    title: "کاتالوگ محصولات",
    description:
      "فهرست کامل پمپ آب، الکتروپمپ صنعتی، مخازن تحت فشار، شیرآلات و اتصالات صنعتی به همراه مشخصات فنی و امکان استعلام قیمت.",
    path: "/products",
  });
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const filters = {
    q: first(params.q),
    category: first(params.category),
    brand: first(params.brand),
    stock: first(params.stock) as StockStatus | undefined,
    onlyPriced: first(params.priced) === "1",
    sort: (first(params.sort) ?? "newest") as SortOption,
    page: Math.max(1, Number(first(params.page) ?? 1) || 1),
  };

  const [{ items, total, page, pageCount }, categories, brands, priceRange, category, brand] =
    await Promise.all([
      listProducts(filters),
      getCategoryTree(),
      getBrands(),
      getPriceRange(),
      filters.category ? getCategoryBySlug(filters.category) : Promise.resolve(null),
      filters.brand ? getBrandBySlug(filters.brand) : Promise.resolve(null),
    ]);

  const title = category?.name ?? (brand ? `محصولات ${brand.name}` : "کاتالوگ محصولات");
  const description =
    category?.description ??
    brand?.description ??
    "تمام تجهیزات آبرسانی و صنعتی در یک فهرست، همراه با مشخصات فنی و امکان استعلام قیمت آنلاین.";

  const filtersPanel = (
    <ProductFilters categories={categories} brands={brands} priceRange={priceRange} />
  );

  function hrefForPage(nextPage: number) {
    return `/products${buildQuery({
      q: filters.q,
      category: filters.category,
      brand: filters.brand,
      stock: filters.stock,
      priced: filters.onlyPriced ? "1" : undefined,
      sort: filters.sort === "newest" ? undefined : filters.sort,
      page: nextPage === 1 ? undefined : nextPage,
    })}`;
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        crumbs={[
          { name: "محصولات", href: "/products" },
          ...(category ? [{ name: category.name, href: `/products?category=${category.slug}` }] : []),
          ...(brand ? [{ name: brand.name, href: `/products?brand=${brand.slug}` }] : []),
        ]}
      />

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-h)+1.5rem)]">
              <Suspense fallback={null}>{filtersPanel}</Suspense>
            </div>
          </aside>

          <div>
            <Suspense fallback={null}>
              <ProductToolbar total={total} filtersSlot={filtersPanel} />
            </Suspense>

            {items.length === 0 ? (
              <EmptyResults query={filters.q} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((product, index) => (
                    <Reveal key={product.id} delay={Math.min(index, 6) * 60}>
                      <ProductCard product={product} />
                    </Reveal>
                  ))}
                </div>

                <Pagination page={page} pageCount={pageCount} buildHref={hrefForPage} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyResults({ query }: { query?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] px-6 py-20 text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--fg-subtle)]">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 4.5 4.5" strokeLinecap="round" />
        </svg>
      </span>
      <h2 className="font-display text-lg font-bold">نتیجه‌ای پیدا نشد</h2>
      <p className="mt-3 max-w-md text-sm leading-8 text-[var(--fg-muted)]">
        {query
          ? `کالایی مطابق «${query}» در کاتالوگ نبود. ممکن است بتوانیم آن را برایتان تأمین کنیم.`
          : "با این ترکیب فیلترها کالایی وجود ندارد. چند فیلتر را حذف کنید."}
      </p>
    </div>
  );
}

export function ProductsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
