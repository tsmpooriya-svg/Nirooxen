import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { getBrandOptions, getCategoryOptions } from "@/modules/admin/queries";
import { requirePageAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const emptyValues: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  model: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  brandId: "",
  status: "DRAFT",
  priceMode: "ON_REQUEST",
  price: "",
  comparePrice: "",
    priceConditionCode: "",
    priceConditionText: "",
    isPromotional: false,
    sourceRef: "",
  unit: "دستگاه",
  stockStatus: "ORDER_ONLY",
  leadTimeDays: "",
  minOrderQty: "1",
  warrantyMonths: "",
  position: "0",
  isFeatured: false,
  isNew: true,
  tags: "",
  metaTitle: "",
  metaDescription: "",
  images: [],
  specs: [{ groupName: "مشخصات عمومی", label: "", value: "", isKey: true }],
};

export default async function NewProductPage() {
  await requirePageAccess("products");

  const [categories, brands] = await Promise.all([getCategoryOptions(), getBrandOptions()]);

  return (
    <>
      <AdminPageHeader
        breadcrumb={[
          { label: "پنل", href: "/admin" },
          { label: "محصولات", href: "/admin/products" },
        ]}
        title="افزودن محصول جدید"
        description="پس از ذخیره، محصول در حالت پیش‌نویس می‌ماند تا زمانی که وضعیت آن را «منتشر شده» کنید."
      />
      <Panel>
        <ProductForm values={emptyValues} categories={categories} brands={brands} />
      </Panel>
    </>
  );
}
