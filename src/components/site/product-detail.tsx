"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { STOCK_STATUS } from "@/lib/constants";
import { cn, formatPrice, toFaDigits } from "@/lib/utils";
import { useCart } from "@/modules/cart/store";

import { OrderForm } from "./order-form";
import { ProductPhoto } from "./product-photo";

type Image = { id: string; url: string; alt: string | null; backdrop: string | null };
type Spec = { id: string; label: string; value: string; unit: string | null; isKey: boolean };
type SpecGroup = { name: string; items: Spec[] };

export type ProductDetailProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    model: string | null;
    shortDescription: string | null;
    description: string | null;
    priceMode: "PUBLIC" | "ON_REQUEST" | "CALL";
    priceConditionText: string | null;
    isPromotional: boolean;
    price: number | null;
    comparePrice: number | null;
    unit: string;
    stockStatus: keyof typeof STOCK_STATUS;
    leadTimeDays: number | null;
    minOrderQty: number;
    warrantyMonths: number | null;
    tags: string[];
  };
  category: { name: string; slug: string };
  brand: { name: string; slug: string; latinName: string | null } | null;
  images: Image[];
  specGroups: SpecGroup[];
};

export function ProductDetail({ product, category, brand, images, specGroups }: ProductDetailProps) {
  const [activeImage, setActiveImage] = React.useState(0);
  const [quantity, setQuantity] = React.useState(product.minOrderQty);
  const [orderOpen, setOrderOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"specs" | "description">(
    specGroups.length > 0 ? "specs" : "description",
  );

  const add = useCart((s) => s.add);
  const { toast } = useToast();

  const stock = STOCK_STATUS[product.stockStatus];
  const hasPrice = product.priceMode === "PUBLIC" && product.price;
  const discount =
    hasPrice && product.comparePrice && product.comparePrice > product.price!
      ? Math.round(((product.comparePrice - product.price!) / product.comparePrice) * 100)
      : null;

  const keySpecs = specGroups.flatMap((g) => g.items).filter((s) => s.isKey).slice(0, 4);

  /*
   * نوار اقدام چسبان موبایل.
   *
   * تا وقتی پنل خرید در دید است چیزی نشان داده نمی‌شود؛ به‌محض اینکه از کادر
   * خارج شد، نوار بالا می‌آید. IntersectionObserver به‌جای رویداد scroll
   * استفاده شده تا در هر فریم اسکرول محاسبه‌ای انجام نشود.
   */
  const buyPanelRef = React.useRef<HTMLElement>(null);
  const [showStickyBar, setShowStickyBar] = React.useState(false);

  React.useEffect(() => {
    const node = buyPanelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { rootMargin: "-120px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function addToCart() {
    add(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        imageUrl: images[0]?.url ?? null,
        unit: product.unit,
        unitPrice: product.price,
        priceMode: product.priceMode,
      },
      quantity,
    );
    toast({ title: "به سبد استعلام اضافه شد", description: product.name, tone: "success" });
  }

  return (
    <>
      {/* pb برای اینکه نوار چسبان موبایل روی محتوای انتهای صفحه نیفتد */}
      <div className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-12 lg:pb-0">
        {/* گالری */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {/* گالری */}
          <div className="brackets relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-inset)]">
            <div className="relative aspect-4/3">
              {images[activeImage] ? (
                <ProductPhoto
                  src={images[activeImage]!.url}
                  alt={images[activeImage]!.alt ?? product.name}
                  backdrop={images[activeImage]!.backdrop}
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  pad="5%"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-[var(--fg-subtle)]">
                  تصویری ثبت نشده است
                </span>
              )}
            </div>

            <span className="absolute start-4 top-4 flex gap-2">
              <Badge tone={stock.tone} dot>
                {stock.label}
              </Badge>
              {discount && <Badge tone="signal">{toFaDigits(discount)}٪ تخفیف</Badge>}
            </span>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`نمایش تصویر ${toFaDigits(index + 1)}`}
                  aria-pressed={index === activeImage}
                  className={cn(
                    "relative size-20 shrink-0 overflow-hidden rounded-md border transition-all duration-300",
                    index === activeImage
                      ? "border-[var(--brand)] shadow-[0_0_0_3px_var(--brand-soft)]"
                      : "border-[var(--border-subtle)] opacity-60 hover:opacity-100",
                  )}
                >
                  {/* در ابعاد ۸۰ پیکسل جا برای قاب نیست؛ فاصله کمتر می‌شود */}
                  <ProductPhoto src={image.url} alt="" sizes="80px" pad="8%" backdrop={image.backdrop} />
                </button>
              ))}
            </div>
          )}

        </div>

        {/* ستون خرید — چسبان روی دسکتاپ */}
        <aside
          ref={buyPanelRef}
          className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-fit"
        >
          <div className="edge-lit rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-micro text-[var(--fg-subtle)]">
              {brand && (
                <Link href={`/brands/${brand.slug}`} className="uppercase transition-colors hover:text-[var(--brand)]">
                  {brand.latinName ?? brand.name}
                </Link>
              )}
              {product.sku && (
                <>
                  <span aria-hidden>·</span>
                  <span dir="ltr">SKU {product.sku}</span>
                </>
              )}
            </div>

            <h1 className="font-display text-2xl font-bold leading-9">{product.name}</h1>

            {product.shortDescription && (
              <p className="mt-3 text-sm leading-8 text-[var(--fg-muted)]">
                {product.shortDescription}
              </p>
            )}

            {/* مشخصات کلیدی */}
            {keySpecs.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--border-hairline)] py-4">
                {keySpecs.map((spec) => (
                  <div key={spec.id}>
                    {/* «حداکثر دبی: ۱۸»، «توان مصرفی: ۵۵۰ وات» — عددهایی که
                        تصمیم خرید را می‌سازند. مقدار ۱۶px، واحد یک پله پایین‌تر
                        تا عدد جلو بیفتد بدون اینکه واحد گم شود. */}
                    <dt className="text-micro text-[var(--fg-subtle)]">{spec.label}</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--fg-primary)]">
                      {spec.value}
                      {spec.unit && (
                        <span className="text-meta font-normal text-[var(--fg-muted)]">
                          {withUnitGap(spec.value, spec.unit)}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* قیمت */}
            <div className="mt-5">
              {hasPrice ? (
                <>
                  {discount && (
                    <p className="text-sm text-[var(--fg-subtle)] line-through">
                      {formatPrice(product.comparePrice)}
                    </p>
                  )}
                  <p className="font-display text-[1.625rem] font-extrabold text-[var(--fg-primary)]">
                    {formatPrice(product.price)}
                  </p>
                  {/*
                    شرط قیمتی همان‌طور که منبع اعلام کرده نمایش داده می‌شود و در
                    عدد قیمت حل نشده است. اگر شرطی ثبت نشده باشد، همان جملهٔ
                    عمومی قبلی می‌ماند.
                  */}
                  <p className="mt-1 text-meta text-[var(--fg-subtle)]">
                    {product.priceConditionText
                      ? `قیمت برای هر ${product.unit} — ${product.priceConditionText}`
                      : `قیمت برای هر ${product.unit}`}
                  </p>
                </>
              ) : (
                <div className="rounded-lg border border-[var(--border-brand)] bg-[var(--brand-soft)] p-4">
                  <p className="text-sm font-semibold text-[var(--brand)]">استعلام قیمت</p>
                  <p className="mt-1.5 text-meta leading-7 text-[var(--fg-secondary)]">
                    قیمت این کالا به مشخصات دقیق و تعداد سفارش بستگی دارد. درخواست خود را ثبت کنید تا
                    کارشناس با شما تماس بگیرد.
                  </p>
                </div>
              )}
            </div>

            {/* تعداد */}
            <div className="mt-5 flex items-center gap-3">
              <span className="text-meta text-[var(--fg-muted)]">تعداد</span>
              <div className="flex items-center rounded-md border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(product.minOrderQty, q - 1))}
                  aria-label="کاهش تعداد"
                  className="grid size-9 place-items-center text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.5 8h9" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="min-w-10 text-center font-mono text-base font-medium">{toFaDigits(quantity)}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                  aria-label="افزایش تعداد"
                  className="grid size-9 place-items-center text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <span className="text-meta text-[var(--fg-subtle)]">{product.unit}</span>
            </div>

            {/* اقدام‌ها */}
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => setOrderOpen(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--brand)] text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
              >
                {hasPrice ? "ثبت سفارش" : "استعلام قیمت"}
              </button>

              <button
                type="button"
                onClick={addToCart}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--border-default)] text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3h2l1.6 8.4a1.5 1.5 0 0 0 1.5 1.2h6.3a1.5 1.5 0 0 0 1.5-1.2L17 6H5.4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8.5" cy="16" r="1.2" />
                  <circle cx="14.5" cy="16" r="1.2" />
                </svg>
                افزودن به سبد استعلام
              </button>
            </div>

            {/* اطلاعات تکمیلی */}
            <ul className="mt-6 space-y-3 border-t border-[var(--border-hairline)] pt-5 text-meta">
              {product.warrantyMonths && (
                <InfoRow label="گارانتی" value={`${toFaDigits(product.warrantyMonths)} ماه`} />
              )}
              {product.leadTimeDays && (
                <InfoRow label="زمان تأمین" value={`حدود ${toFaDigits(product.leadTimeDays)} روز کاری`} />
              )}
              <InfoRow label="حداقل سفارش" value={`${toFaDigits(product.minOrderQty)} ${product.unit}`} />
              <InfoRow label="دسته‌بندی" value={category.name} href={`/products?category=${category.slug}`} />
            </ul>

            {product.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5 border-t border-[var(--border-hairline)] pt-5">
                {product.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/products?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-[var(--border-hairline)] px-2.5 py-1 text-micro text-[var(--fg-muted)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {/*
            تب مشخصات / توضیحات.

            محصولی که نه مشخصهٔ فنی دارد و نه توضیح، هیچ تبی هم ندارد؛ بدون این
            شرط، فقط خطِ زیرِ نوار تب و یک فضای خالی رندر می‌شد — یک خط افقیِ
            بی‌دلیل وسط صفحه. چنین محصولاتی کم نیستند، چون بخشی از کاتالوگ هنوز
            مشخصات فنی ندارد.
          */}
          {(specGroups.length > 0 || product.description) && (
          <div>
            <div
              role="tablist"
              aria-label="اطلاعات محصول"
              className="flex gap-1 border-b border-[var(--border-hairline)]"
            >
              {specGroups.length > 0 && (
                <TabButton active={activeTab === "specs"} onClick={() => setActiveTab("specs")}>
                  مشخصات فنی
                </TabButton>
              )}
              {product.description && (
                <TabButton active={activeTab === "description"} onClick={() => setActiveTab("description")}>
                  توضیحات و کاربرد
                </TabButton>
              )}
            </div>

            <div className="pt-6">
              {activeTab === "specs" && specGroups.length > 0 && (
                <div role="tabpanel" className="space-y-8">
                  {specGroups.map((group) => (
                    <section key={group.name}>
                      <h3 className="eyebrow mb-4 flex items-center gap-2.5">
                        <span className="inline-block h-px w-6 bg-[var(--brand)]" aria-hidden />
                        {group.name}
                      </h3>
                      <dl className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                        {group.items.map((spec, index) => (
                          <div
                            key={spec.id}
                            className={cn(
                              "flex items-start gap-4 px-4 py-3 text-meta",
                              index % 2 === 0 ? "bg-[var(--bg-elev-1)]" : "bg-[var(--bg-elev-2)]",
                            )}
                          >
                            <dt className="w-40 shrink-0 text-[var(--fg-muted)]">{spec.label}</dt>
                            <dd className="flex-1 font-medium text-[var(--fg-primary)]">
                              {spec.value}
                              {spec.unit && (
                                <span className="font-normal text-[var(--fg-muted)]">
                                  {withUnitGap(spec.value, spec.unit)}
                                </span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              )}

              {activeTab === "description" && product.description && (
                <div role="tabpanel" className="max-w-3xl">
                  {product.description.split("\n\n").map((paragraph, index) => {
                    if (paragraph.startsWith("### ")) {
                      return (
                        <h3 key={index} className="mb-3 mt-7 font-display text-base font-bold first:mt-0">
                          {paragraph.replace("### ", "")}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith("> ")) {
                      return (
                        <blockquote
                          key={index}
                          className="my-6 border-s-2 border-[var(--brand)] bg-[var(--brand-soft)] px-5 py-4 text-sm leading-8 text-[var(--fg-secondary)]"
                        >
                          {paragraph.replace("> ", "")}
                        </blockquote>
                      );
                    }
                    return (
                      <p key={index} className="mb-4 text-sm leading-9 text-[var(--fg-secondary)]">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      <Modal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title={hasPrice ? "ثبت سفارش" : "استعلام قیمت"}
        description={product.name}
        size="md"
      >
        <OrderForm
          type={hasPrice ? "ORDER" : "QUOTE"}
          source="PRODUCT_PAGE"
          lines={[
            {
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              productSlug: product.slug,
              imageUrl: images[0]?.url ?? null,
              unit: product.unit,
              unitPrice: product.price,
              quantity,
            },
          ]}
        />
      </Modal>

      {/* نوار اقدام چسبان — فقط موبایل و تبلت */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-subtle)] lg:hidden",
          "bg-[var(--bg-glass-strong)] backdrop-blur-xl transition-transform duration-400",
          "[transition-timing-function:var(--ease-out-expo)]",
          "pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_-12px_rgb(0_0_0/0.35)]",
          showStickyBar ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            {hasPrice ? (
              <>
                <p className="font-display text-base font-extrabold leading-tight text-[var(--fg-primary)]">
                  {formatPrice(product.price)}
                </p>
                <p className="mt-0.5 truncate text-micro text-[var(--fg-subtle)]">
                  هر {product.unit}
                </p>
              </>
            ) : (
              <>
                <p className="text-meta font-semibold text-[var(--brand-text)]">استعلام قیمت</p>
                <p className="mt-0.5 truncate text-micro text-[var(--fg-subtle)]">{stock.label}</p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={addToCart}
            aria-label={`افزودن ${product.name} به سبد استعلام`}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--border-default)] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand-text)]"
          >
            <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3h2l1.6 8.4a1.5 1.5 0 0 0 1.5 1.2h6.3a1.5 1.5 0 0 0 1.5-1.2L17 6H5.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="16" r="1.2" />
              <circle cx="14.5" cy="16" r="1.2" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setOrderOpen(true)}
            className="flex h-11 shrink-0 items-center justify-center rounded-md bg-[var(--brand)] px-6 text-meta font-medium text-[var(--fg-on-brand)]"
          >
            {hasPrice ? "ثبت سفارش" : "استعلام قیمت"}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * فاصله میان مقدار و واحد باید کاراکتر واقعی باشد نه margin، وگرنه متن کپی‌شده
 * و صفحه‌خوان «۲۴لیتر» می‌دهند. دقیقاً یک فاصله می‌ماند: اگر مقدار خودش به
 * فاصله ختم شود یا واحد با فاصله شروع شود، دومی حذف می‌شود.
 */
function withUnitGap(value: string, unit: string): string {
  const trimmed = unit.trimStart();
  return /\s$/.test(value) ? trimmed : ` ${trimmed}`;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative px-5 py-3 text-sm font-medium transition-colors duration-200",
        active ? "text-[var(--brand)]" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]",
      )}
    >
      {children}
      <span
        className={cn(
          "absolute inset-x-0 -bottom-px h-0.5 origin-center bg-[var(--brand)] transition-transform duration-300",
          "[transition-timing-function:var(--ease-out-expo)]",
          active ? "scale-x-100" : "scale-x-0",
        )}
        aria-hidden
      />
    </button>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-[var(--fg-subtle)]">{label}</span>
      {href ? (
        <Link href={href} className="font-medium text-[var(--brand)] transition-opacity hover:opacity-80">
          {value}
        </Link>
      ) : (
        <span className="font-medium text-[var(--fg-secondary)]">{value}</span>
      )}
    </li>
  );
}
