import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { formatDateTime, toFaDigits } from "@/lib/utils";
import { getAdminProduct, getBrandOptions, getCategoryOptions } from "@/modules/admin/queries";
import { requirePageAccess } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Params }) {
  await requirePageAccess("products");

  const { id } = await params;
  const data = await getAdminProduct(id);
  if (!data) notFound();

  const [categories, brands] = await Promise.all([getCategoryOptions(), getBrandOptions()]);
  const { product, images, specs } = data;

  const values: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? "",
    model: product.model ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId,
    brandId: product.brandId ?? "",
    status: product.status,
    priceMode: product.priceMode,
    price: product.price ? String(product.price) : "",
    comparePrice: product.comparePrice ? String(product.comparePrice) : "",
    priceConditionCode: product.priceConditionCode ?? "",
    priceConditionText: product.priceConditionText ?? "",
    isPromotional: product.isPromotional,
    sourceRef: product.sourceRef ?? "",
    unit: product.unit,
    stockStatus: product.stockStatus,
    leadTimeDays: product.leadTimeDays ? String(product.leadTimeDays) : "",
    minOrderQty: String(product.minOrderQty),
    warrantyMonths: product.warrantyMonths ? String(product.warrantyMonths) : "",
    position: String(product.position ?? 0),
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    tags: product.tags.join("، "),
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    images: images.map((image) => ({
      url: image.url,
      alt: image.alt ?? undefined,
      storageKey: image.storageKey ?? undefined,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
    })),
    specs: specs.map((spec) => ({
      groupName: spec.groupName,
      label: spec.label,
      value: spec.value,
      unit: spec.unit ?? undefined,
      isKey: spec.isKey,
    })),
  };

  return (
    <>
      <AdminPageHeader
        breadcrumb={[
          { label: "پنل", href: "/admin" },
          { label: "محصولات", href: "/admin/products" },
        ]}
        title={product.name}
        description={`آخرین ویرایش ${formatDateTime(product.updatedAt)} · ${toFaDigits(product.viewCount)} بازدید · ${toFaDigits(product.orderCount)} سفارش`}
        actions={
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="flex h-10 items-center gap-2 rounded-md border border-[var(--border-subtle)] px-4 text-sm transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
          >
            مشاهده در سایت
          </Link>
        }
      />
      <Panel>
        <ProductForm values={values} categories={categories} brands={brands} />
      </Panel>
    </>
  );
}
