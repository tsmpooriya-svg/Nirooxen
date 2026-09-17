"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { cn, formatPrice } from "@/lib/utils";
import { ProductThumb } from "./product-photo";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type SearchHit = {
  id: string;
  name: string;
  slug: string;
  model: string | null;
  categoryName: string;
  brandName: string | null;
  price: number | null;
  priceMode: string;
  imageUrl: string | null;
};

/**
 * جستجوی سراسری با میان‌بر Ctrl/⌘+K.
 * درخواست‌ها debounce شده و با AbortController لغو می‌شوند تا پاسخ‌های قدیمی
 * روی نتایج جدید ننشینند.
 */
export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [fetchedHits, setFetchedHits] = React.useState<SearchHit[]>([]);
  // نتایج فقط تا وقتی معتبرند که پرس‌وجو خالی نباشد
  const hits = query.trim() ? fetchedHits : [];
  const [loading, setLoading] = React.useState(false);
  const [rateLimited, setRateLimited] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const openerRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 60);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // هنگام بستن، کانون به همان دکمه‌ای برمی‌گردد که دیالوگ را باز کرده بود
  React.useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  // نگه‌داشتن کانون داخل دیالوگ تا وقتی باز است
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
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
  }, [open]);

  React.useEffect(() => {
    // با پرس‌وجوی خالی هیچ درخواستی زده نمی‌شود؛ خالی‌کردن نتایج در زمان
    // رندر مشتق می‌شود (به `hits` پایین‌تر نگاه کنید) نه با setState در effect.
    if (!query.trim()) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      // اسپینر بعد از پایان debounce روشن می‌شود، نه با هر بار فشردن کلید
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { items: SearchHit[]; error?: string };
        // ۴۲۹ یعنی «فعلاً نه»، نه «چیزی پیدا نشد» — دو حالت کاملاً متفاوت
        setRateLimited(res.status === 429 || data.error === "RATE_LIMITED");
        setFetchedHits(res.ok ? (data.items ?? []) : []);
        setActiveIndex(0);
      } catch {
        /* درخواست لغو شد */
      } finally {
        setLoading(false);
      }
    }, 240);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const hit = hits[activeIndex];
    if (hit) router.push(`/products/${hit.slug}`);
    else if (query.trim()) router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="جستجوی محصولات"
        className="group flex h-10 items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand)] md:w-56 lg:w-64 2xl:w-80"
      >
        <svg viewBox="0 0 20 20" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        <span className="hidden flex-1 truncate text-start text-meta md:block">جستجوی محصول…</span>
        <kbd className="hidden shrink-0 rounded-xs border border-[var(--border-subtle)] px-1.5 py-0.5 font-mono text-micro text-[var(--fg-subtle)] lg:block">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]">
          <div
            className="absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm anim-fade-in"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="جستجوی محصولات"
            className="anim-pop relative w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elev-1)] shadow-[var(--shadow-xl)]"
          >
            <form onSubmit={submit} className="flex items-center gap-3 border-b border-[var(--border-hairline)] px-5">
              <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="9" cy="9" r="6" />
                <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  }
                }}
                placeholder="نام محصول، مدل یا کد کالا…"
                aria-label="جستجو"
                className="h-16 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--fg-subtle)]"
              />
              {loading && (
                <span className="anim-spin size-4 shrink-0 rounded-full border-2 border-[var(--brand)] border-t-transparent" />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-xs border border-[var(--border-subtle)] px-2 py-1 font-mono text-micro text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg-primary)]"
              >
                ESC
              </button>
            </form>

            <div className="max-h-[52vh] overflow-y-auto">
              {query.trim() && !loading && rateLimited && (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-[var(--fg-muted)]">جستجوی شما موقتاً محدود شده است.</p>
                  <p className="mt-2 text-meta text-[var(--fg-subtle)]">
                    چند لحظه صبر کنید و دوباره تلاش کنید.
                  </p>
                </div>
              )}

              {query.trim() && !loading && !rateLimited && hits.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-[var(--fg-muted)]">نتیجه‌ای برای «{query}» پیدا نشد.</p>
                  <p className="mt-2 text-meta text-[var(--fg-subtle)]">
                    می‌توانید درخواست تأمین کالا ثبت کنید؛ کارشناسان ما پیگیری می‌کنند.
                  </p>
                </div>
              )}

              {hits.map((hit, index) => (
                <Link
                  key={hit.id}
                  href={`/products/${hit.slug}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex items-center gap-4 border-b border-[var(--border-hairline)] px-5 py-3.5 transition-colors last:border-0",
                    index === activeIndex ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--bg-elev-3)]",
                  )}
                >
                  {hit.imageUrl && (
                    <ProductThumb src={hit.imageUrl} className="size-11 rounded-sm" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--fg-primary)]">
                      {hit.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-micro text-[var(--fg-subtle)]">
                      {[hit.brandName, hit.model, hit.categoryName].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-meta text-[var(--fg-muted)]">
                    {hit.priceMode === "PUBLIC" && hit.price
                      ? formatPrice(hit.price)
                      : "استعلام قیمت"}
                  </span>
                </Link>
              ))}

              {!query.trim() && (
                <div className="px-5 py-6">
                  <p className="eyebrow mb-3">جستجوهای پرتکرار</p>
                  <div className="flex flex-wrap gap-2">
                    {["پمپ آب خانگی", "بوستر پمپ", "منبع تحت فشار", "شیر فلکه", "پمپ شناور", "الکتروپمپ"].map(
                      (term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setQuery(term)}
                          className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-meta text-[var(--fg-muted)] transition-all duration-200 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                        >
                          {term}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
