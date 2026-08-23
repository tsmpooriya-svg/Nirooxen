import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { pageMetadata } from "@/lib/seo";
import { toFaDigits } from "@/lib/utils";
import { getBrands } from "@/modules/catalog/queries";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "برندها",
  description:
    "فهرست برندهای معتبر داخلی و اروپایی که تجهیزات آن‌ها را تأمین می‌کنیم؛ از گراندفوس و ابارا تا پمپیران و سمنان انرژی.",
  path: "/brands",
});

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <>
      <PageHeader
        title="برندها"
        description="تجهیزات را از تولیدکنندگانی تأمین می‌کنیم که سابقه‌شان در پروژه‌های واقعی اثبات شده و شبکه خدمات پس از فروش دارند."
        crumbs={[{ name: "برندها", href: "/brands" }]}
      />

      <div className="shell py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand, index) => (
            <Reveal key={brand.id} delay={index * 60}>
              <Link
                href={`/brands/${brand.slug}`}
                className="brackets group flex h-full flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold transition-colors group-hover:text-[var(--brand)]">
                      {brand.name}
                    </h2>
                    {brand.latinName && (
                      <p className="mt-1.5 font-mono text-[0.6875rem] tracking-[0.16em] text-[var(--fg-subtle)]">
                        {brand.latinName.toUpperCase()}
                      </p>
                    )}
                  </div>
                  {brand.country && (
                    <span className="shrink-0 rounded-full border border-[var(--border-hairline)] px-2.5 py-1 text-[0.6875rem] text-[var(--fg-muted)]">
                      {brand.country}
                    </span>
                  )}
                </div>

                {brand.description && (
                  <p className="clamp-3 text-[0.8125rem] leading-7 text-[var(--fg-muted)]">
                    {brand.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-[var(--border-hairline)] pt-4">
                  <span className="font-mono text-[0.6875rem] text-[var(--fg-subtle)]">
                    {toFaDigits(brand.productCount)} کالا
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] transition-all duration-300 group-hover:gap-3">
                    مشاهده محصولات
                    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}
