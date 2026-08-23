"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { cn, formatPrice } from "@/lib/utils";

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
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  React.useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { items: SearchHit[] };
        setHits(data.items ?? []);
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
        type="button"
        onClick={() => setOpen(true)}
        aria-label="جستجوی محصولات"
        className="group flex h-10 items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand)] md:w-56 lg:w-64"
      >
        <svg viewBox="0 0 20 20" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        <span className="hidden flex-1 text-start text-[0.8125rem] md:block">جستجوی محصول…</span>
        <kbd className="hidden shrink-0 rounded-xs border border-[var(--border-subtle)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--fg-subtle)] lg:block">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]">
          <div
            className="absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm anim-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="anim-pop relative w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elev-1)] shadow-[var(--shadow-xl)]">
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
                className="h-16 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-[var(--fg-subtle)]"
              />
              {loading && (
                <span className="anim-spin size-4 shrink-0 rounded-full border-2 border-[var(--brand)] border-t-transparent" />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-xs border border-[var(--border-subtle)] px-2 py-1 font-mono text-[0.625rem] text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg-primary)]"
              >
                ESC
              </button>
            </form>

            <div className="max-h-[52vh] overflow-y-auto">
              {query.trim() && !loading && hits.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-[var(--fg-muted)]">نتیجه‌ای برای «{query}» پیدا نشد.</p>
                  <p className="mt-2 text-xs text-[var(--fg-subtle)]">
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.imageUrl}
                      alt=""
                      className="size-11 shrink-0 rounded-sm border border-[var(--border-hairline)] object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--fg-primary)]">
                      {hit.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[0.6875rem] text-[var(--fg-subtle)]">
                      {[hit.brandName, hit.model, hit.categoryName].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--fg-muted)]">
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
                          className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--fg-muted)] transition-all duration-200 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
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
