import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { ProductCard } from "@/components/site/product-card";
import { ProductFilters, ProductToolbar } from "@/components/site/product-filters";
import { Pagination } from "@/components/ui/pagination";
import { logSearch } from "@/lib/search-log";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { pageMetadata } from "@/lib/seo";
import { SPEC_PARAM_PREFIX, parseSpecParams } from "@/lib/spec-filter-params";
import { buildQuery } from "@/lib/utils";
import { sortFilterSchema, stockFilterSchema } from "@/lib/validation";
import {
  getBrandBySlug,
  getBrands,
  getCategoryBySlug,
  getCategorySpecFacets,
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
        /*
          canonical عمداً به `‎/brands/{slug}` می‌رود، نه به خودِ این نشانی.

          این دو صفحه دقیقاً یک چیز را نشان می‌دهند — همان فهرست محصولات همان
          برند، با همان عنوان — و هر دو تا امروز canonical خودشان را داشتند.
          یعنی یک محتوا با دو نشانیِ ایندکس‌پذیر، که سیگنال‌ها را بین خودشان
          تقسیم می‌کرد. `‎/brands/{slug}` همانی است که در sitemap هست، پس
          مرجع همان می‌شود.

          نشانی فیلتر عوض نمی‌شود و ریدایرکت هم در کار نیست: کاربر همان‌جا
          می‌ماند و فیلترش کار می‌کند.
        */
        path: `/brands/${brand.slug}`,
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

  const categorySlug = first(params.category);

  /*
   * فیلترهای فنی قابل نمایش، از دسته‌بندی فعال خوانده می‌شوند. کلیدهای
   * مجاز هم از همین‌جا می‌آید تا پارامتر دست‌کاری‌شده در URL نتواند روی
   * مشخصه‌ای فیلتر بزند که به این دسته تعلق ندارد.
   */
  const specFacets = await getCategorySpecFacets(categorySlug);
  const specs = parseSpecParams(params, specFacets.map((f) => f.key));

  const filters = {
    q: first(params.q),
    category: categorySlug,
    brand: first(params.brand),
    stock: stockFilterSchema.parse(first(params.stock)),
    onlyPriced: first(params.priced) === "1",
    sort: sortFilterSchema.parse(first(params.sort)),
    page: Math.max(1, Number(first(params.page) ?? 1) || 1),
    specs,
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

  /*
    فقط صفحهٔ نخست ثبت می‌شود: ورق زدن نتایج، جست‌وجوی تازه نیست و شمارش را
    باد می‌کند. ثبت با after انجام می‌شود تا پاسخ منتظر یک درج نماند.
  */
  if (filters.q && filters.page === 1) {
    const term = filters.q;
    after(() => logSearch(term, total, "catalog"));
  }

  if (filters.page > pageCount) redirect(hrefForPage(pageCount));

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.category ||
      filters.brand ||
      filters.stock ||
      filters.onlyPriced ||
      filters.specs.length > 0,
  );

  const title = category?.name ?? (brand ? `محصولات ${brand.name}` : "کاتالوگ محصولات");
  const description =
    category?.description ??
    brand?.description ??
    "تمام تجهیزات آبرسانی و صنعتی در یک فهرست، همراه با مشخصات فنی و امکان استعلام قیمت آنلاین.";

  const filtersPanel = (
    <ProductFilters
      categories={categories}
      brands={brands}
      priceRange={priceRange}
      specFacets={specFacets}
    />
  );

  function hrefForPage(nextPage: number) {
    // پارامترهای مشخصات فنی هنگام صفحه‌بندی باید حفظ شوند
    const specParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (!key.startsWith(SPEC_PARAM_PREFIX)) continue;
      const v = first(value);
      if (v) specParams[key] = v;
    }

    return `/products${buildQuery({
      q: filters.q,
      category: filters.category,
      brand: filters.brand,
      stock: filters.stock,
      priced: filters.onlyPriced ? "1" : undefined,
      sort: filters.sort === "newest" ? undefined : filters.sort,
      ...specParams,
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
          <aside className="hidden lg:block" aria-labelledby="filters-heading">
            {/*
              ستون فیلتر عنوان دیداری ندارد، ولی گروه‌هایش h3 هستند و بدون h2ی
              بالای سرشان، ترتیب سرفصل‌ها از h1 صفحه یک‌باره به h3 می‌پرید.
              نسخهٔ موبایل همین عنوان را دیداری دارد؛ اینجا فقط برای صفحه‌خوان.
            */}
            <h2 id="filters-heading" className="sr-only">
              فیلترها
            </h2>
            <div className="sticky top-[calc(var(--header-h)+1.5rem)]">
              <Suspense fallback={null}>{filtersPanel}</Suspense>
            </div>
          </aside>

          <div>
            <Suspense fallback={null}>
              <ProductToolbar total={total} filtersSlot={filtersPanel} />
            </Suspense>

            {items.length === 0 ? (
              <EmptyResults query={filters.q} hasActiveFilters={hasActiveFilters} />
            ) : (
              <>
                {/*
                  کارت‌های محصول تیتر h3 دارند و مستقیم زیر h1 صفحه می‌نشستند؛
                  این h2 پنهان، پرش سطح تیتر را برای صفحه‌خوان‌ها می‌بندد.
                */}
                <h2 className="sr-only">فهرست محصولات</h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
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

function EmptyResults({ query, hasActiveFilters }: { query?: string; hasActiveFilters: boolean }) {
  const heading = hasActiveFilters ? "نتیجه‌ای پیدا نشد" : "هنوز کالایی در کاتالوگ ثبت نشده است";
  const body = query
    ? `کالایی مطابق «${query}» در کاتالوگ نبود. ممکن است بتوانیم آن را برایتان تأمین کنیم.`
    : hasActiveFilters
      ? "با این ترکیب فیلترها کالایی وجود ندارد. چند فیلتر را حذف کنید."
      : "کاتالوگ در حال تکمیل است. برای استعلام مستقیم با کارشناسان ما تماس بگیرید.";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] px-6 py-20 text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--fg-subtle)]">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 4.5 4.5" strokeLinecap="round" />
        </svg>
      </span>
      <h2 className="font-display text-lg font-bold">{heading}</h2>
      <p className="mt-3 max-w-md text-sm leading-8 text-[var(--fg-muted)]">{body}</p>
      {query ? (
        /*
          جست‌وجوی بی‌نتیجه، دقیقاً همان چیزی است که مشتری می‌خواهد و ما
          صفحه‌اش را نداریم. متن بالا می‌گفت «ممکن است بتوانیم تأمینش کنیم»
          ولی تنها دکمهٔ صفحه «نمایش همه محصولات» بود — یعنی همان نیت، همان‌جا
          از بین می‌رفت. حالا جست‌وجو با خودش به فرم تماس می‌رود و در موضوع
          می‌نشیند.
        */
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/contact?subject=${encodeURIComponent(query)}`}
            className="inline-flex h-11 items-center rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-colors duration-300 hover:bg-[var(--brand-hover)]"
          >
            درخواست تأمین این کالا
          </Link>
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
          >
            نمایش همه محصولات
          </Link>
        </div>
      ) : hasActiveFilters ? (
        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
        >
          نمایش همه محصولات
        </Link>
      ) : (
        <Link
          href="/contact"
          className="mt-6 inline-flex h-11 items-center rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
        >
          تماس با کارشناسان
        </Link>
      )}
    </div>
  );
}

export function ProductsLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
