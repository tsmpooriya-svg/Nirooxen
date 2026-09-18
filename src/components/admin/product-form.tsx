"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useReadOnly } from "./shell";
import { useToast } from "@/components/ui/toast";
import { PRICE_MODE, PRODUCT_STATUS, STOCK_STATUS } from "@/lib/constants";
import { cn, toFaDigits } from "@/lib/utils";
import { saveProduct, type ActionState } from "@/modules/admin/actions";

type CategoryOption = { id: string; name: string; depth: number };
type BrandOption = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  model: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId: string;
  status: string;
  priceMode: string;
  price: string;
  comparePrice: string;
  priceConditionCode: string;
  priceConditionText: string;
  isPromotional: boolean;
  sourceRef: string;
  unit: string;
  stockStatus: string;
  leadTimeDays: string;
  minOrderQty: string;
  warrantyMonths: string;
  position: string;
  isFeatured: boolean;
  isNew: boolean;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  images: {
    url: string;
    alt?: string;
    storageKey?: string;
    width?: number;
    height?: number;
    backdrop?: string;
  }[];
  specs: { groupName: string; label: string; value: string; unit?: string; isKey?: boolean }[];
};

const initialState: ActionState = { status: "idle" };

const PLACEHOLDER_IMAGES = [
  "/images/products/centrifugal-pump.svg",
  "/images/products/electro-pump.svg",
  "/images/products/pressure-tank.svg",
  "/images/products/gate-valve.svg",
  "/images/products/pipe-fitting.svg",
  "/images/products/booster-set.svg",
  "/images/products/submersible-pump.svg",
  "/images/products/water-filter.svg",
  "/images/products/generic.svg",
];

export function ProductForm({
  values,
  categories,
  brands,
}: {
  values: ProductFormValues;
  categories: CategoryOption[];
  brands: BrandOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const action = saveProduct.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const readOnly = useReadOnly();

  const [priceMode, setPriceMode] = React.useState(values.priceMode);
  const [images, setImages] = React.useState(values.images);
  const [specs, setSpecs] = React.useState(values.specs);
  const [tab, setTab] = React.useState<"main" | "specs" | "media" | "seo">("main");

  React.useEffect(() => {
    if (state.status === "idle") return;
    toast({
      title: state.status === "success" ? "ذخیره شد" : "خطا",
      description: state.message,
      tone: state.status === "success" ? "success" : "error",
    });
    if (state.status === "success" && !values.id && state.id) {
      router.push(`/admin/products/${state.id}`);
    }
  }, [state, toast, router, values.id]);

  const tabs = [
    { key: "main" as const, label: "اطلاعات اصلی" },
    { key: "specs" as const, label: `مشخصات فنی (${toFaDigits(specs.length)})` },
    { key: "media" as const, label: `تصاویر (${toFaDigits(images.length)})` },
    { key: "seo" as const, label: "سئو" },
  ];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="specs" value={JSON.stringify(specs)} />

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-hairline)] no-scrollbar">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 text-meta font-medium transition-colors",
              tab === item.key ? "text-[var(--brand)]" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]",
            )}
          >
            {item.label}
            <span
              className={cn(
                "absolute inset-x-0 -bottom-px h-0.5 origin-center bg-[var(--brand)] transition-transform duration-300",
                tab === item.key ? "scale-x-100" : "scale-x-0",
              )}
              aria-hidden
            />
          </button>
        ))}
      </div>

      {/* — اطلاعات اصلی — */}
      <div className={cn("space-y-5", tab !== "main" && "hidden")}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="نام محصول" htmlFor="name" required error={state.errors?.name} className="lg:col-span-2">
            <Input id="name" name="name" defaultValue={values.name} required invalid={Boolean(state.errors?.name)} />
          </Field>

          <Field label="نامک (slug)" htmlFor="slug" hint="خالی بگذارید تا خودکار از نام ساخته شود.">
            <Input id="slug" name="slug" defaultValue={values.slug} dir="ltr" className="text-start font-mono text-xs" />
          </Field>

          <Field label="کد کالا (SKU)" htmlFor="sku">
            <Input id="sku" name="sku" defaultValue={values.sku} dir="ltr" className="text-start font-mono text-xs" />
          </Field>

          <Field label="مدل / نام فنی" htmlFor="model">
            <Input id="model" name="model" defaultValue={values.model} dir="ltr" className="text-start" />
          </Field>

          <Field label="واحد فروش" htmlFor="unit">
            <Input id="unit" name="unit" defaultValue={values.unit || "دستگاه"} />
          </Field>

          <Field label="دسته‌بندی" htmlFor="categoryId" required error={state.errors?.categoryId}>
            <Select id="categoryId" name="categoryId" defaultValue={values.categoryId} required>
              <option value="">— انتخاب کنید —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.depth > 0 ? `— ${category.name}` : category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="برند" htmlFor="brandId">
            <Select id="brandId" name="brandId" defaultValue={values.brandId}>
              <option value="">— بدون برند —</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="توضیح کوتاه" htmlFor="shortDescription" className="lg:col-span-2" hint="در کارت محصول و نتایج جستجو نمایش داده می‌شود (حداکثر ۴۰۰ کاراکتر).">
            <Textarea id="shortDescription" name="shortDescription" rows={2} defaultValue={values.shortDescription} />
          </Field>

          <Field
            label="توضیحات کامل"
            htmlFor="description"
            className="lg:col-span-2"
            hint="برای تیتر از ### و برای نقل‌قول از > در ابتدای پاراگراف استفاده کنید."
          >
            <Textarea id="description" name="description" rows={10} defaultValue={values.description} />
          </Field>
        </div>

        <fieldset className="rounded-lg border border-[var(--border-subtle)] p-5">
          <legend className="px-2 text-meta font-medium text-[var(--fg-secondary)]">قیمت و موجودی</legend>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="نحوه نمایش قیمت" htmlFor="priceMode">
              <Select
                id="priceMode"
                name="priceMode"
                value={priceMode}
                onChange={(e) => setPriceMode(e.target.value)}
              >
                {Object.entries(PRICE_MODE).map(([key, entry]) => (
                  <option key={key} value={key}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="قیمت (تومان)"
              htmlFor="price"
              error={state.errors?.price}
              hint={priceMode !== "PUBLIC" ? "در حالت استعلامی نادیده گرفته می‌شود." : undefined}
            >
              <Input
                id="price"
                name="price"
                defaultValue={values.price}
                dir="ltr"
                inputMode="numeric"
                disabled={priceMode !== "PUBLIC"}
                className="text-start font-mono"
              />
            </Field>

            <Field label="قیمت پیش از تخفیف" htmlFor="comparePrice">
              <Input
                id="comparePrice"
                name="comparePrice"
                defaultValue={values.comparePrice}
                dir="ltr"
                inputMode="numeric"
                disabled={priceMode !== "PUBLIC"}
                className="text-start font-mono"
              />
            </Field>

            <Field label="وضعیت موجودی" htmlFor="stockStatus">
              <Select id="stockStatus" name="stockStatus" defaultValue={values.stockStatus}>
                {Object.entries(STOCK_STATUS).map(([key, entry]) => (
                  <option key={key} value={key}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="زمان تأمین (روز)" htmlFor="leadTimeDays">
              <Input id="leadTimeDays" name="leadTimeDays" defaultValue={values.leadTimeDays} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <Field label="حداقل سفارش" htmlFor="minOrderQty">
              <Input id="minOrderQty" name="minOrderQty" defaultValue={values.minOrderQty || "1"} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <Field label="ترتیب نمایش" htmlFor="position">
              <Input id="position" name="position" defaultValue={values.position} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            <Field label="گارانتی (ماه)" htmlFor="warrantyMonths">
              <Input id="warrantyMonths" name="warrantyMonths" defaultValue={values.warrantyMonths} dir="ltr" inputMode="numeric" className="text-start font-mono" />
            </Field>

            {/*
              شرط قیمتی جدا از قیمت پایه نوشته می‌شود؛ قیمت پایه همان چیزی
              می‌ماند که منبع اعلام کرده است.
            */}
            <Field label="کد شرط قیمت" htmlFor="priceConditionCode" hint="مثلاً SURCHARGE_3_PERCENT">
              <Input id="priceConditionCode" name="priceConditionCode" defaultValue={values.priceConditionCode} dir="ltr" className="text-start font-mono text-xs" />
            </Field>

            <Field label="متن شرط قیمت" htmlFor="priceConditionText" hint="روی صفحه محصول، پایین عدد قیمت دیده می‌شود.">
              <Input id="priceConditionText" name="priceConditionText" defaultValue={values.priceConditionText} />
            </Field>

            <Field label="ارجاع منبع (داخلی)" htmlFor="sourceRef" hint="فقط کد خنثی؛ در سایت نمایش داده نمی‌شود.">
              <Input id="sourceRef" name="sourceRef" defaultValue={values.sourceRef} dir="ltr" className="text-start font-mono text-xs" />
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="وضعیت انتشار" htmlFor="status">
            <Select id="status" name="status" defaultValue={values.status}>
              {Object.entries(PRODUCT_STATUS).map(([key, entry]) => (
                <option key={key} value={key}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="برچسب‌ها" htmlFor="tags" hint="با ویرگول جدا کنید.">
            <Input id="tags" name="tags" defaultValue={values.tags} placeholder="پمپ آب، تک فاز، خانگی" />
          </Field>

          <div className="flex flex-col justify-end gap-3 pb-1">
            <Checkbox name="isFeatured" defaultChecked={values.isFeatured} label="محصول شاخص (نمایش در صفحه اصلی)" />
            <Checkbox name="isNew" defaultChecked={values.isNew} label="نشان «جدید»" />
            <Checkbox name="isPromotional" defaultChecked={values.isPromotional} label="فروش ویژه" />
          </div>
        </div>
      </div>

      {/* — مشخصات فنی — */}
      <div className={cn(tab !== "specs" && "hidden")}>
        <SpecEditor specs={specs} onChange={setSpecs} />
      </div>

      {/* — تصاویر — */}
      <div className={cn(tab !== "media" && "hidden")}>
        <ImageEditor images={images} onChange={setImages} productId={values.id} />
      </div>

      {/* — سئو — */}
      <div className={cn("grid gap-5", tab !== "seo" && "hidden")}>
        <Field label="عنوان متا" htmlFor="metaTitle" hint="اگر خالی باشد از نام محصول استفاده می‌شود (حداکثر ۶۰ کاراکتر توصیه می‌شود).">
          <Input id="metaTitle" name="metaTitle" defaultValue={values.metaTitle} />
        </Field>
        <Field label="توضیحات متا" htmlFor="metaDescription" hint="۱۲۰ تا ۱۶۰ کاراکتر بهترین نتیجه را در گوگل دارد.">
          <Textarea id="metaDescription" name="metaDescription" rows={3} defaultValue={values.metaDescription} />
        </Field>
      </div>

      {/* نوار ذخیره چسبان */}
      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] px-1 py-4 backdrop-blur-xl">
        <p className="text-xs text-[var(--fg-subtle)]">
          {values.id ? "ویرایش محصول موجود" : "ایجاد محصول جدید"}
        </p>
        {!readOnly && (
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)] disabled:opacity-60"
          >
            {pending ? "در حال ذخیره…" : "ذخیره محصول"}
          </button>
        )}
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  ویرایشگر مشخصات فنی                                                        */
/* -------------------------------------------------------------------------- */

function SpecEditor({
  specs,
  onChange,
}: {
  specs: ProductFormValues["specs"];
  onChange: (next: ProductFormValues["specs"]) => void;
}) {
  function update(index: number, patch: Partial<ProductFormValues["specs"][number]>) {
    onChange(specs.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= specs.length) return;
    const next = [...specs];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-6 text-[var(--fg-muted)]">
        مشخصات با «گروه» دسته‌بندی می‌شوند و در صفحه محصول به همان ترتیب نمایش داده می‌شوند. مشخصاتی که
        «کلیدی» علامت بخورند، در کارت محصول و ستون خرید هم دیده می‌شوند.
      </p>

      {specs.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--border-default)] p-8 text-center text-sm text-[var(--fg-subtle)]">
          هنوز مشخصه‌ای اضافه نشده است.
        </p>
      )}

      <ul className="space-y-2">
        {specs.map((spec, index) => (
          <li key={index} className="grid gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3 lg:grid-cols-[9rem_1fr_1fr_7rem_auto]">
            <input
              value={spec.groupName}
              onChange={(e) => update(index, { groupName: e.target.value })}
              placeholder="گروه"
              className="h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-xs outline-none focus:border-[var(--brand)]"
            />
            <input
              value={spec.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="عنوان مشخصه"
              className="h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-xs outline-none focus:border-[var(--brand)]"
            />
            <input
              value={spec.value}
              onChange={(e) => update(index, { value: e.target.value })}
              placeholder="مقدار"
              className="h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-xs outline-none focus:border-[var(--brand)]"
            />
            <input
              value={spec.unit ?? ""}
              onChange={(e) => update(index, { unit: e.target.value })}
              placeholder="واحد"
              className="h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-xs outline-none focus:border-[var(--brand)]"
            />

            <div className="flex items-center gap-1">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border-subtle)] px-2.5 py-2 text-micro text-[var(--fg-muted)]">
                <input
                  type="checkbox"
                  checked={Boolean(spec.isKey)}
                  onChange={(e) => update(index, { isKey: e.target.checked })}
                  className="size-3.5 accent-[var(--brand)]"
                />
                کلیدی
              </label>
              <button
                type="button"
                onClick={() => move(index, -1)}
                aria-label="انتقال به بالا"
                className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m4 10 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                aria-label="انتقال به پایین"
                className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onChange(specs.filter((_, i) => i !== index))}
                aria-label="حذف مشخصه"
                className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger-text)]"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          onChange([...specs, { groupName: specs.at(-1)?.groupName ?? "مشخصات عمومی", label: "", value: "" }])
        }
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border-default)] text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
        </svg>
        افزودن مشخصه
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ویرایشگر تصاویر                                                            */
/* -------------------------------------------------------------------------- */

function ImageEditor({
  images,
  onChange,
  productId,
}: {
  images: ProductFormValues["images"];
  onChange: (next: ProductFormValues["images"]) => void;
  productId?: string;
}) {
  const { toast } = useToast();
  const [url, setUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const readOnly = useReadOnly();

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !productId) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("productId", productId);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = (await response.json()) as {
        url?: string;
        storageKey?: string;
        width?: number;
        height?: number;
        backdrop?: string;
        error?: string;
      };
      if (!response.ok || !result.url) {
        toast({ title: "بارگذاری ناموفق", description: result.error ?? "خطای نامشخص", tone: "error" });
        return;
      }
      onChange([
        ...images,
        {
          url: result.url,
          storageKey: result.storageKey,
          width: result.width,
          height: result.height,
          backdrop: result.backdrop,
        },
      ]);
      toast({ title: "تصویر بارگذاری شد", tone: "success" });
    } catch {
      toast({ title: "بارگذاری ناموفق", description: "ارتباط با سرور برقرار نشد.", tone: "error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-6 text-[var(--fg-muted)]">
        تصویر را بارگذاری کنید، نشانی آن را وارد کنید یا یکی از تصاویر فنی آماده را انتخاب کنید. اولین
        تصویر، تصویر اصلی محصول است.
      </p>

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPick}
          className="hidden"
        />
        <button
          type="button"
          disabled={readOnly || !productId || uploading}
          onClick={() => fileRef.current?.click()}
          className="h-10 rounded-md bg-[var(--brand)] px-4 text-xs font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-60"
        >
          {uploading ? "در حال بارگذاری…" : "بارگذاری تصویر"}
        </button>
        <span className="text-micro text-[var(--fg-subtle)]">
          {productId ? "JPEG، PNG یا WebP" : "برای بارگذاری، ابتدا محصول را ذخیره کنید"}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/images/products/example.svg یا https://…"
          dir="ltr"
          className="h-10 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-start text-xs outline-none focus:border-[var(--brand)]"
        />
        <button
          type="button"
          onClick={() => {
            if (!url.trim()) return;
            onChange([...images, { url: url.trim() }]);
            setUrl("");
          }}
          className="h-10 shrink-0 rounded-md bg-[var(--brand)] px-4 text-xs font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
        >
          افزودن
        </button>
      </div>

      <div>
        <p className="mb-2 text-micro text-[var(--fg-subtle)]">تصاویر فنی آماده:</p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDER_IMAGES.map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => onChange([...images, { url: path }])}
              className="relative size-16 overflow-hidden rounded-md border border-[var(--border-subtle)] transition-all hover:border-[var(--brand)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={path} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {images.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li key={index} className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)]">
              <div className="relative aspect-4/3 bg-[var(--bg-inset)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt ?? ""} className="size-full object-contain p-2" />
                {index === 0 && (
                  <span className="absolute start-2 top-2 rounded-full bg-[var(--brand)] px-2 py-0.5 text-micro font-medium text-[var(--fg-on-brand)]">
                    تصویر اصلی
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 p-2">
                <input
                  value={image.alt ?? ""}
                  onChange={(e) =>
                    onChange(images.map((img, i) => (i === index ? { ...img, alt: e.target.value } : img)))
                  }
                  placeholder="متن جایگزین (alt)"
                  className="h-8 min-w-0 flex-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-2 text-micro outline-none focus:border-[var(--brand)]"
                />
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...images];
                      [next[index], next[index - 1]] = [next[index - 1]!, next[index]!];
                      onChange(next);
                    }}
                    aria-label="انتقال به ابتدا"
                    className="grid size-8 shrink-0 place-items-center rounded-md text-[var(--fg-subtle)] hover:text-[var(--brand)]"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m10 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                  aria-label="حذف تصویر"
                  className="grid size-8 shrink-0 place-items-center rounded-md text-[var(--fg-subtle)] hover:text-[var(--danger-text)]"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
