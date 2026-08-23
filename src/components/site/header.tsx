"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { ThemeToggle } from "@/components/theme-provider";
import { DomainIcon, Logomark } from "@/components/ui/icons";
import { mainNav, siteConfig } from "@/config/site";
import type { CategoryNode } from "@/modules/catalog/queries";
import { cn, toFaDigits } from "@/lib/utils";

import { CartButton } from "./cart-panel";
import { SearchDialog } from "./search-dialog";

export function SiteHeader({ categories }: { categories: CategoryNode[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [megaOpen, setMegaOpen] = React.useState(false);
  const closeTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const openMega = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), 160);
  };

  return (
    <>
      {/* نوار اطلاعات تماس — روی موبایل مخفی است */}
      <div className="hidden border-b border-[var(--border-hairline)] bg-[var(--bg-sunken)] lg:block">
        <div className="shell flex h-10 items-center justify-between text-xs text-[var(--fg-muted)]">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-px bg-[var(--brand)]" aria-hidden />
              {siteConfig.tagline}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span>{siteConfig.contact.workingHours}</span>
            <a
              href={`tel:${siteConfig.contact.phonesRaw[0]}`}
              className="flex items-center gap-1.5 font-medium text-[var(--fg-secondary)] transition-colors hover:text-[var(--brand)]"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 2.5h2.5l1 3-1.6 1a8 8 0 0 0 3.6 3.6l1-1.6 3 1V13a1 1 0 0 1-1.1 1A11 11 0 0 1 2 3.6 1 1 0 0 1 3 2.5Z" />
              </svg>
              <span className="num">{siteConfig.contact.phones[0]}</span>
            </a>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-500",
          "[transition-timing-function:var(--ease-out-expo)]",
          scrolled
            ? "glass border-[var(--border-subtle)] shadow-[var(--shadow-md)]"
            : "border-transparent bg-[var(--bg-base)]",
        )}
      >
        <div className="shell flex h-[var(--header-h)] items-center gap-4">
          {/* لوگو */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={siteConfig.name}>
            <Logomark className="size-9 text-[var(--brand)] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:rotate-[15deg] sm:size-10" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[1.0625rem] font-extrabold tracking-tight text-[var(--fg-primary)] sm:text-lg">
                {siteConfig.name}
              </span>
              <span className="mt-1 font-mono text-[0.5625rem] tracking-[0.22em] text-[var(--fg-subtle)]">
                {siteConfig.latinName}
              </span>
            </span>
          </Link>

          {/* ناوبری دسکتاپ */}
          <nav className="mx-auto hidden items-center lg:flex" aria-label="ناوبری اصلی">
            {mainNav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const isProducts = "hasMegaMenu" in item && item.hasMegaMenu;
              return (
                <div
                  key={item.href}
                  onMouseEnter={isProducts ? openMega : undefined}
                  onMouseLeave={isProducts ? scheduleClose : undefined}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-1 whitespace-nowrap px-3.5 py-2 text-[0.875rem] font-medium transition-colors duration-200",
                      active ? "text-[var(--brand)]" : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]",
                    )}
                    aria-current={active ? "page" : undefined}
                    aria-expanded={isProducts ? megaOpen : undefined}
                  >
                    {item.title}
                    {isProducts && (
                      <svg
                        viewBox="0 0 16 16"
                        className={cn("size-3 transition-transform duration-300", megaOpen && "rotate-180")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden
                      >
                        <path d="m4 6 4 4 4-4" strokeLinecap="round" />
                      </svg>
                    )}
                    <span
                      className={cn(
                        "absolute inset-x-3 -bottom-px h-px origin-center scale-x-0 bg-[var(--brand)] transition-transform duration-300",
                        "[transition-timing-function:var(--ease-out-expo)]",
                        active && "scale-x-100",
                      )}
                      aria-hidden
                    />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* ابزارها */}
          <div className="ms-auto flex items-center gap-2 lg:ms-0">
            <SearchDialog />
            <CartButton />
            <ThemeToggle className="hidden sm:grid" />
            <a
              href={`tel:${siteConfig.contact.mobileRaw}`}
              className="hidden h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)] xl:flex"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2.5h2.5l1 3-1.6 1a8 8 0 0 0 3.6 3.6l1-1.6 3 1V13a1 1 0 0 1-1.1 1A11 11 0 0 1 2 3.6 1 1 0 0 1 3 2.5Z" />
              </svg>
              مشاوره رایگان
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={mobileOpen}
              className="grid size-10 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--fg-secondary)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)] lg:hidden"
            >
              <span className="relative block h-3.5 w-5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "absolute inset-x-0 h-[1.5px] rounded-full bg-current transition-all duration-300",
                      "[transition-timing-function:var(--ease-out-expo)]",
                      i === 0 && (mobileOpen ? "top-1.5 rotate-45" : "top-0"),
                      i === 1 && (mobileOpen ? "top-1.5 opacity-0" : "top-1.5"),
                      i === 2 && (mobileOpen ? "top-1.5 -rotate-45" : "top-3"),
                    )}
                  />
                ))}
              </span>
            </button>
          </div>
        </div>

        {/* مگا منوی محصولات */}
        <div
          onMouseEnter={openMega}
          onMouseLeave={scheduleClose}
          className={cn(
            "absolute inset-x-0 top-full hidden overflow-hidden border-b border-[var(--border-subtle)] lg:block",
            "glass shadow-[var(--shadow-lg)] transition-all duration-400",
            "[transition-timing-function:var(--ease-out-expo)]",
            megaOpen ? "visible max-h-[32rem] opacity-100" : "invisible max-h-0 opacity-0",
          )}
        >
          <div className="shell grid grid-cols-4 gap-x-8 gap-y-6 py-8">
            {categories.slice(0, 8).map((category, index) => (
              <div
                key={category.id}
                style={{ transitionDelay: megaOpen ? `${index * 35}ms` : "0ms" }}
                className={cn(
                  "transition-all duration-500 [transition-timing-function:var(--ease-out-expo)]",
                  megaOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                )}
              >
                <Link
                  href={`/products?category=${category.slug}`}
                  className="group mb-3 flex items-center gap-2.5"
                >
                  <span className="grid size-9 place-items-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--brand)] transition-all duration-300 group-hover:border-[var(--border-brand)] group-hover:bg-[var(--brand-soft)]">
                    <DomainIcon name={category.icon} className="size-[18px]" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--fg-primary)] transition-colors group-hover:text-[var(--brand)]">
                      {category.name}
                    </span>
                    <span className="block font-mono text-[0.625rem] text-[var(--fg-subtle)]">
                      {toFaDigits(category.productCount)} کالا
                    </span>
                  </span>
                </Link>
                <ul className="space-y-1.5 ps-1">
                  {category.children.slice(0, 4).map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/products?category=${child.slug}`}
                        className="block text-[0.8125rem] text-[var(--fg-muted)] transition-all duration-200 hover:translate-x-[-3px] hover:text-[var(--brand)]"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-sunken)]/60">
            <div className="shell flex items-center justify-between py-3.5 text-xs">
              <span className="text-[var(--fg-muted)]">
                محصول موردنظرتان را پیدا نکردید؟ کارشناسان ما آن را برایتان تأمین می‌کنند.
              </span>
              <Link
                href="/products"
                className="flex items-center gap-1.5 font-medium text-[var(--brand)] transition-all hover:gap-2.5"
              >
                مشاهده همه محصولات
                <svg viewBox="0 0 16 16" className="size-3.5 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* منوی موبایل */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm transition-opacity duration-400",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <nav
          className={cn(
            "absolute inset-y-0 end-0 flex w-[min(21rem,88vw)] flex-col border-s border-[var(--border-subtle)]",
            "bg-[var(--bg-elev-1)] shadow-[var(--shadow-xl)] transition-transform duration-500",
            "[transition-timing-function:var(--ease-out-expo)]",
            mobileOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
          )}
          aria-label="ناوبری موبایل"
        >
          <div className="flex h-[var(--header-h)] items-center justify-between border-b border-[var(--border-hairline)] px-5">
            <span className="font-display font-bold">منو</span>
            <ThemeToggle />
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <ul className="space-y-1">
              {mainNav.map((item, index) => (
                <li
                  key={item.href}
                  style={{ transitionDelay: mobileOpen ? `${80 + index * 40}ms` : "0ms" }}
                  className={cn(
                    "transition-all duration-500 [transition-timing-function:var(--ease-out-expo)]",
                    mobileOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
                  )}
                >
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-md px-3 py-3 text-[0.9375rem] font-medium text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-elev-3)] hover:text-[var(--brand)]"
                  >
                    {item.title}
                    <svg viewBox="0 0 16 16" className="size-3.5 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-[var(--border-hairline)] pt-6">
              <p className="eyebrow mb-3">دسته‌بندی‌ها</p>
              <ul className="grid grid-cols-2 gap-2">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="flex items-center gap-2 rounded-md border border-[var(--border-hairline)] p-2.5 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
                    >
                      <DomainIcon name={category.icon} className="size-4 shrink-0 text-[var(--brand)]" />
                      <span className="truncate">{category.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[var(--border-hairline)] p-5">
            <a
              href={`tel:${siteConfig.contact.mobileRaw}`}
              className="flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand)] font-medium text-[var(--fg-on-brand)]"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2.5h2.5l1 3-1.6 1a8 8 0 0 0 3.6 3.6l1-1.6 3 1V13a1 1 0 0 1-1.1 1A11 11 0 0 1 2 3.6 1 1 0 0 1 3 2.5Z" />
              </svg>
              تماس با کارشناس فروش
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}
