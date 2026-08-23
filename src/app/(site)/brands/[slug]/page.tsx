import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { ProductCard } from "@/components/site/product-card";
import { pageMetadata } from "@/lib/seo";
import { toFaDigits } from "@/lib/utils";
import { getBrandBySlug, getBrands, listProducts } from "@/modules/catalog/queries";

type Params = Promise<{ slug: string }>;

export const revalidate = 3600;

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return pageMetadata({ title: "برند یافت نشد", path: `/brands/${slug}`, noIndex: true });

  return pageMetadata({
    title: brand.metaTitle ?? `محصولات ${brand.name}`,
    description: brand.metaDescription ?? brand.description ?? undefined,
    path: `/brands/${brand.slug}`,
  });
}

export default async function BrandPage({ params }: { params: Params }) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand || !brand.isActive) notFound();

  const { items, total } = await listProducts({ brand: brand.slug, pageSize: 24 });

  return (
    <>
      <PageHeader
        title={`محصولات ${brand.name}`}
        description={brand.description ?? undefined}
        crumbs={[
          { name: "برندها", href: "/brands" },
          { name: brand.name, href: `/brands/${brand.slug}` },
        ]}
      >
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-xs">
          {brand.latinName && (
            <div>
              <dt className="text-[var(--fg-subtle)]">نام لاتین</dt>
              <dd className="mt-1 font-mono text-[var(--fg-secondary)]">{brand.latinName}</dd>
            </div>
          )}
          {brand.country && (
            <div>
              <dt className="text-[var(--fg-subtle)]">کشور سازنده</dt>
              <dd className="mt-1 font-medium text-[var(--fg-secondary)]">{brand.country}</dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--fg-subtle)]">تعداد کالا</dt>
            <dd className="mt-1 font-mono text-[var(--fg-secondary)]">{toFaDigits(total)}</dd>
          </div>
        </dl>
      </PageHeader>

      <div className="shell py-12">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-default)] p-12 text-center text-sm text-[var(--fg-muted)]">
            در حال حاضر محصولی از این برند در کاتالوگ ثبت نشده است. برای استعلام تماس بگیرید.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index, 6) * 60}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
