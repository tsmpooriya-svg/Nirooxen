import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { Reveal } from "@/components/motion/reveal";
import { Breadcrumb } from "@/components/site/breadcrumb";
import { ProductCard } from "@/components/site/product-card";
import { ProductDetail } from "@/components/site/product-detail";
import { SectionHeading } from "@/components/site/section";
import { JsonLd, pageMetadata, productJsonLd } from "@/lib/seo";
import {
  getAllProductSlugs,
  getCategoryPath,
  getProductBySlug,
  getRelatedProducts,
  incrementProductView,
} from "@/modules/catalog/queries";

type Params = Promise<{ slug: string }>;

/** صفحات محصول در زمان build ساخته و هر ۳۰ دقیقه تازه‌سازی می‌شوند */
export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return pageMetadata({ title: "محصول یافت نشد", path: `/products/${slug}`, noIndex: true });

  const { product, images } = data;
  return pageMetadata({
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? undefined,
    path: `/products/${product.slug}`,
    image: images[0]?.url ?? null,
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();

  const { product, category, brand, images, specGroups } = data;

  const [related, categoryPath] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId, category.parentId, product.brandId),
    getCategoryPath(category.slug),
  ]);

  // شمارنده بازدید پس از ارسال پاسخ اجرا می‌شود تا رندر صفحه را کند نکند
  after(() => incrementProductView(product.id));

  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: product.name,
          slug: product.slug,
          description: product.shortDescription ?? product.description,
          sku: product.sku,
          brandName: brand?.name ?? null,
          image: images[0]?.url ?? null,
          price: product.price,
          priceMode: product.priceMode,
          stockStatus: product.stockStatus,
        })}
      />

      <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
        <div className="shell">
          <Breadcrumb
            items={[
              { name: "محصولات", href: "/products" },
              ...categoryPath.map((c) => ({ name: c.name, href: `/products?category=${c.slug}` })),
              { name: product.name, href: `/products/${product.slug}` },
            ]}
          />
        </div>
      </div>

      <div className="shell py-10">
        <ProductDetail
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            model: product.model,
            shortDescription: product.shortDescription,
            description: product.description,
            priceMode: product.priceMode,
            price: product.price,
            comparePrice: product.comparePrice,
            priceConditionText: product.priceConditionText,
            isPromotional: product.isPromotional,
            unit: product.unit,
            stockStatus: product.stockStatus,
            leadTimeDays: product.leadTimeDays,
            minOrderQty: product.minOrderQty,
            warrantyMonths: product.warrantyMonths,
            tags: product.tags,
          }}
          category={{ name: category.name, slug: category.slug }}
          brand={brand ? { name: brand.name, slug: brand.slug, latinName: brand.latinName } : null}
          images={images.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))}
          specGroups={specGroups.map((group) => ({
            name: group.name,
            items: group.items.map((item) => ({
              id: item.id,
              label: item.label,
              value: item.value,
              unit: item.unit,
              isKey: item.isKey,
            })),
          }))}
        />
      </div>

      {related.length > 0 && (
        <section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)] py-16">
          <div className="shell">
            <SectionHeading
              eyebrow="گزینه‌های مشابه"
              title="محصولات مرتبط"
              action={{ label: `همه ${category.name}`, href: `/products?category=${category.slug}` }}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item, index) => (
                <Reveal key={item.id} delay={index * 70}>
                  <ProductCard product={item} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
