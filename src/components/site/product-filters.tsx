"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { DomainIcon } from "@/components/ui/icons";
import { SORT_OPTIONS, STOCK_STATUS } from "@/lib/constants";
import { SPEC_PARAM_PREFIX, specParamName } from "@/lib/spec-filter-params";
import { cn, formatPrice, toFaDigits } from "@/lib/utils";
import type { CategoryNode, SpecFacet } from "@/modules/catalog/queries";

type Brand = { id: string; name: string; slug: string; productCount: number };

const SHEET_TITLE_ID = "product-filter-sheet-title";
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * پنل فیلتر.
 *
 * وضعیت فیلترها در URL نگهداری می‌شود، نه در state کامپوننت. نتیجه: قابل
 * اشتراک‌گذاری، قابل بوکمارک، سازگار با دکمه Back و رندرشونده روی سرور.
 */
export function ProductFilters({
  categories,
  brands,
  priceRange,
  specFacets = [],
  className,
  onNavigate,
}: {
  categories: CategoryNode[];
  brands: Brand[];
  priceRange: { min: number; max: number };
  /** فیلترهای مشخصات فنی — از دسته‌بندی فعال ساخته می‌شوند، نه hard-code */
  specFacets?: SpecFacet[];
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activeCategory = params.get("category");
  const activeBrand = params.get("brand");
  const activeStock = params.get("stock");
  const onlyPriced = params.get("priced") === "1";

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const category of categories) {
      if (
        activeCategory === category.slug ||
        category.children.some((child) => child.slug === activeCategory)
      ) {
        initial[category.id] = true;
      }
    }
    return initial;
  });

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    onNavigate?.();
  }

  /** مقادیر متنی انتخاب‌شده برای یک مشخصه */
  function selectedSpecValues(key: string): string[] {
    const raw = params.get(specParamName(key));
    return raw ? raw.split(",").map((v) => v.trim()).filter(Boolean) : [];
  }

  function toggleSpecValue(key: string, value: string) {
    const current = selectedSpecValues(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const search = new URLSearchParams(params.toString());
    if (next.length === 0) search.delete(specParamName(key));
    else search.set(specParamName(key), next.join(","));
    search.delete("page");
    router.push(`${pathname}?${search.toString()}`, { scroll: false });
    onNavigate?.();
  }

  function applySpecRange(key: string, min: string, max: string) {
    const search = new URLSearchParams(params.toString());
    for (const [bound, value] of [["min", min], ["max", max]] as const) {
      const name = specParamName(key, bound);
      if (value.trim() === "") search.delete(name);
      else search.set(name, value.trim());
    }
    search.delete("page");
    router.push(`${pathname}?${search.toString()}`, { scroll: false });
    onNavigate?.();
  }

  const hasSpecFilters = [...params.keys()].some((k) => k.startsWith(SPEC_PARAM_PREFIX));
  const hasFilters = Boolean(
    activeCategory || activeBrand || activeStock || onlyPriced || params.get("q") || hasSpecFilters,
  );

  return (
    <div className={cn("space-y-6", className)}>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            router.push(pathname, { scroll: false });
            onNavigate?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-default)] py-2.5 text-meta font-medium text-[var(--fg-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger-text)]"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
          پاک کردن همه فیلترها
        </button>
      )}

      {/* دسته‌بندی */}
      <FilterGroup title="دسته‌بندی">
        <ul className="space-y-0.5">
          {categories.map((category) => {
            const isOpen = openGroups[category.id];
            const isActive = activeCategory === category.slug;
            return (
              <li key={category.id}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setParam("category", category.slug)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex flex-1 items-center gap-2.5 rounded-sm px-2 py-2 text-start text-meta transition-colors",
                      isActive
                        ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                        : "text-[var(--fg-secondary)] hover:bg-[var(--bg-elev-3)]",
                    )}
                  >
                    <DomainIcon
                      name={category.icon}
                      className={cn("size-4 shrink-0", isActive ? "text-[var(--brand)]" : "text-[var(--fg-subtle)]")}
                    />
                    <span className="flex-1 truncate">{category.name}</span>
                    <FacetCount value={category.productCount} />
                  </button>
                  {category.children.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenGroups((s) => ({ ...s, [category.id]: !s[category.id] }))}
                      aria-label={isOpen ? "بستن زیرشاخه‌ها" : "نمایش زیرشاخه‌ها"}
                      aria-expanded={isOpen}
                      className="grid size-7 shrink-0 place-items-center rounded-sm text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className={cn("size-3 transition-transform duration-300", isOpen && "rotate-180")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        aria-hidden
                      >
                        <path d="m4 6 4 4 4-4" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>

                {category.children.length > 0 && (
                  <ul
                    className={cn(
                      "grid overflow-hidden transition-all duration-400",
                      "[transition-timing-function:var(--ease-out-expo)]",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <li className="min-h-0">
                      <ul className="ms-6 border-s border-[var(--border-hairline)] ps-2">
                        {category.children.map((child) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() => setParam("category", child.slug)}
                              aria-pressed={activeCategory === child.slug}
                              className={cn(
                                "w-full rounded-sm px-2 py-1.5 text-start text-meta transition-colors",
                                activeCategory === child.slug
                                  ? "font-medium text-[var(--brand)]"
                                  : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]",
                              )}
                            >
                              {child.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      {/* برند */}
      <FilterGroup title="برند">
        <ul className="max-h-64 space-y-0.5 overflow-y-auto pe-1">
          {brands.map((brand) => (
            <li key={brand.id}>
              <button
                type="button"
                onClick={() => setParam("brand", brand.slug)}
                aria-pressed={activeBrand === brand.slug}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-start text-meta transition-colors",
                  activeBrand === brand.slug
                    ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                    : "text-[var(--fg-secondary)] hover:bg-[var(--bg-elev-3)]",
                )}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-xs border transition-colors",
                    activeBrand === brand.slug
                      ? "border-[var(--brand)] bg-[var(--brand)]"
                      : "border-[var(--border-default)]",
                  )}
                  aria-hidden
                >
                  {activeBrand === brand.slug && (
                    <svg viewBox="0 0 12 12" className="size-2.5 text-[var(--fg-on-brand)]" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m2 6.2 2.6 2.6L10 3.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{brand.name}</span>
                <FacetCount value={brand.productCount} />
              </button>
            </li>
          ))}
        </ul>
      </FilterGroup>

      {/* موجودی */}
      <FilterGroup title="وضعیت موجودی">
        <ul className="space-y-0.5">
          {(["IN_STOCK", "LOW_STOCK", "ORDER_ONLY"] as const).map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setParam("stock", key)}
                aria-pressed={activeStock === key}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-start text-meta transition-colors",
                  activeStock === key
                    ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                    : "text-[var(--fg-secondary)] hover:bg-[var(--bg-elev-3)]",
                )}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: `var(--${STOCK_STATUS[key].tone === "neutral" ? "fg-subtle" : STOCK_STATUS[key].tone})` }}
                  aria-hidden
                />
                {STOCK_STATUS[key].label}
              </button>
            </li>
          ))}
        </ul>
      </FilterGroup>

      {/* قیمت */}
      <FilterGroup title="قیمت">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-meta text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-elev-3)]">
          <input
            type="checkbox"
            checked={onlyPriced}
            onChange={() => setParam("priced", onlyPriced ? null : "1")}
            className="size-4 accent-[var(--brand)]"
          />
          فقط کالاهای دارای قیمت
        </label>
        {priceRange.max > 0 && (
          <p className="mt-2 px-2 text-micro leading-6 text-[var(--fg-subtle)]">
            بازه قیمت کالاهای قیمت‌دار: {formatPrice(priceRange.min, { withUnit: false })} تا{" "}
            {formatPrice(priceRange.max)}
          </p>
        )}
      </FilterGroup>

      {/*
        فیلترهای فنی — کاملاً داده‌محور.
        فهرست، برچسب، واحد و نوع ورودی از spec_definitions/category_specs
        می‌آید. افزودن مشخصه تازه از پنل مدیریت، بدون تغییر این کامپوننت
        فیلترش را اینجا ظاهر می‌کند.
      */}
      {specFacets.map((facet) =>
        facet.filterUi === "RANGE" ? (
          <SpecRangeFilter key={facet.key} facet={facet} params={params} onApply={applySpecRange} />
        ) : (
          <SpecOptionsFilter
            key={facet.key}
            facet={facet}
            selected={selectedSpecValues(facet.key)}
            onToggle={toggleSpecValue}
          />
        ),
      )}

      <div className="rounded-lg border border-[var(--border-brand)] bg-[var(--brand-soft)] p-4">
        <p className="text-meta leading-7 text-[var(--fg-secondary)]">
          محصول موردنظرتان در فهرست نیست؟ درخواست تأمین ثبت کنید؛ کارشناسان ما آن را پیدا می‌کنند.
        </p>
        <Link
          href="/contact"
          className="mt-3 flex h-9 items-center justify-center rounded-md bg-[var(--brand)] text-meta font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
        >
          درخواست تأمین کالا
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  فیلترهای مشخصات فنی                                                         */
/* -------------------------------------------------------------------------- */

/**
 * فیلتر بازه عددی.
 *
 * مقدارها بر حسب **واحد پایه** تبادل می‌شوند تا مقایسه بین واحدهای مختلف
 * (اسب بخار / کیلووات) درست بماند؛ برچسب واحد پایه کنار ورودی نشان داده
 * می‌شود تا کاربر بداند عدد را در چه واحدی وارد می‌کند.
 *
 * ورودی‌ها تا زمان فشردن «اعمال» مقدار محلی دارند؛ این کار از یک درخواست
 * شبکه به ازای هر کلید فشرده‌شده جلوگیری می‌کند.
 */
function SpecRangeFilter({
  facet,
  params,
  onApply,
}: {
  facet: SpecFacet;
  params: URLSearchParams;
  onApply: (key: string, min: string, max: string) => void;
}) {
  const urlMin = params.get(specParamName(facet.key, "min")) ?? "";
  const urlMax = params.get(specParamName(facet.key, "max")) ?? "";
  const [min, setMin] = React.useState(urlMin);
  const [max, setMax] = React.useState(urlMax);

  // وقتی URL از بیرون عوض شد (پاک‌کردن فیلترها، دکمه Back) ورودی‌ها همگام شوند
  const [lastUrl, setLastUrl] = React.useState({ urlMin, urlMax });
  if (lastUrl.urlMin !== urlMin || lastUrl.urlMax !== urlMax) {
    setLastUrl({ urlMin, urlMax });
    setMin(urlMin);
    setMax(urlMax);
  }

  const dirty = min !== urlMin || max !== urlMax;
  const unit = facet.unitSymbol ?? facet.unitLabel;
  const hint =
    facet.min !== null && facet.max !== null
      ? `موجود: ${toFaDigits(round(facet.min))} تا ${toFaDigits(round(facet.max))}`
      : null;

  return (
    <FilterGroup title={unit ? `${facet.label} (${unit})` : facet.label}>
      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span className="sr-only">{`کمینه ${facet.label}`}</span>
          <input
            type="number"
            inputMode="decimal"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={facet.min !== null ? String(round(facet.min)) : "از"}
            dir="ltr"
            className="h-10 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2.5 text-center font-mono text-meta outline-none transition-colors hover:border-[var(--border-brand)] focus:border-[var(--brand)]"
          />
        </label>
        <span className="text-meta text-[var(--fg-subtle)]" aria-hidden>
          تا
        </span>
        <label className="flex-1">
          <span className="sr-only">{`بیشینه ${facet.label}`}</span>
          <input
            type="number"
            inputMode="decimal"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={facet.max !== null ? String(round(facet.max)) : "تا"}
            dir="ltr"
            className="h-10 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2.5 text-center font-mono text-meta outline-none transition-colors hover:border-[var(--border-brand)] focus:border-[var(--brand)]"
          />
        </label>
      </div>

      {hint && <p className="mt-2 font-mono text-micro text-[var(--fg-subtle)]">{hint}</p>}

      {dirty && (
        <button
          type="button"
          onClick={() => onApply(facet.key, min, max)}
          className="mt-3 h-8 w-full rounded-md bg-[var(--brand)] text-meta font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
        >
          اعمال
        </button>
      )}
    </FilterGroup>
  );
}

/** فیلتر چندانتخابی برای مشخصه‌های متنی */
function SpecOptionsFilter({
  facet,
  selected,
  onToggle,
}: {
  facet: SpecFacet;
  selected: string[];
  onToggle: (key: string, value: string) => void;
}) {
  return (
    <FilterGroup title={facet.label}>
      <ul className="space-y-0.5">
        {facet.options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <li key={option.value}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-meta transition-colors",
                  checked
                    ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                    : "text-[var(--fg-secondary)] hover:bg-[var(--bg-elev-3)]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(facet.key, option.value)}
                  className="size-4 shrink-0 accent-[var(--brand)]"
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <FacetCount value={option.count} />
              </label>
            </li>
          );
        })}
      </ul>
    </FilterGroup>
  );
}

/** جداکننده فقط برای صفحه‌خوان است؛ بدون آن نام دسترس‌پذیر «پنتاکس۲» خوانده می‌شود */
function FacetCount({ value }: { value: number }) {
  return (
    <span className="shrink-0 font-mono text-micro text-[var(--fg-subtle)]">
      <span className="sr-only"> — </span>
      {toFaDigits(value)}
    </span>
  );
}

/** اعداد پایه ممکن است اعشار طولانی داشته باشند (۰٫۵ اسب = ۰٫۳۷۲۸۵ کیلووات) */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4">
      <h3 className="mb-3 text-meta font-semibold text-[var(--fg-primary)]">{title}</h3>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  نوار ابزار بالای لیست: مرتب‌سازی + فیلتر موبایل                            */
/* -------------------------------------------------------------------------- */

export function ProductToolbar({
  total,
  filtersSlot,
}: {
  total: number;
  filtersSlot: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const sort = params.get("sort") ?? "newest";

  // شیت modal است، پس صفحه پشتش نباید اسکرول شود
  React.useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  // بستن با Escape
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // عنوان شیت کانون را می‌گیرد تا صفحه‌خوان بداند کجاست؛ هنگام بستن، کانون به
  // همان دکمه‌ای برمی‌گردد که شیت را باز کرده بود
  React.useEffect(() => {
    if (!mobileOpen) return;
    const trigger = triggerRef.current;
    headingRef.current?.focus();
    return () => {
      if (trigger?.isConnected) trigger.focus();
    };
  }, [mobileOpen]);

  // نگه‌داشتن کانون داخل شیت تا وقتی باز است
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const sheet = sheetRef.current;
      if (!sheet) return;

      const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      if (items.length === 0) return;

      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1]!.focus();
      } else if (!event.shiftKey && (index === -1 || index === items.length - 1)) {
        event.preventDefault();
        items[0]!.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function onSortChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "newest") next.delete("sort");
    else next.set("sort", value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-3">
        <p className="text-meta text-[var(--fg-muted)]">
          <span className="font-mono text-[var(--fg-primary)]">{toFaDigits(total)}</span> کالا یافت شد
        </p>

        <div className="flex items-center gap-2">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-haspopup="dialog"
            className="flex h-10 items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 text-meta text-[var(--fg-secondary)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)] lg:hidden"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M2 4h12M4 8h8M6.5 12h3" strokeLinecap="round" />
            </svg>
            فیلترها
          </button>

          <label className="flex items-center gap-2">
            <span className="sr-only">مرتب‌سازی</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-10 cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-meta outline-none transition-colors hover:border-[var(--border-brand)] focus:border-[var(--brand)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/*
        شیت پایینی فیلتر (موبایل).
        قبلاً کشوی کناری بود. روی موبایل، شیت پایینی هم در دسترس شست است و هم
        الگوی متعارف iOS/Android؛ دکمه «نمایش نتایج» دقیقاً جایی می‌نشیند که
        انگشت هست، نه در گوشه بالای صفحه.
      */}
      <div
        className={cn("fixed inset-0 z-[70] lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}
        inert={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={SHEET_TITLE_ID}
          className={cn(
            "absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col rounded-t-2xl border-t border-[var(--border-subtle)]",
            "bg-[var(--bg-base)] shadow-[0_-16px_48px_-16px_rgb(0_0_0/0.45)] transition-transform duration-400",
            "[transition-timing-function:var(--ease-out-expo)]",
            mobileOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          {/* دستگیره */}
          <div className="flex shrink-0 justify-center pt-3" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
          </div>

          <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-2">
            <h2 id={SHEET_TITLE_ID} ref={headingRef} tabIndex={-1} className="font-display text-base font-bold outline-none">
              فیلترها
            </h2>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="بستن"
              className="grid size-9 place-items-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elev-3)]"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* بدنه اسکرول‌شونده */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{filtersSlot}</div>

          {/* اقدام چسبان */}
          <div className="shrink-0 border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-12 w-full items-center justify-center rounded-md bg-[var(--brand)] text-sm font-medium text-[var(--fg-on-brand)]"
            >
              نمایش {toFaDigits(total)} کالا
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
