"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { ThemeToggle } from "@/components/theme-provider";
import { Logomark } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import { USER_ROLE, can, isReadOnly, type PermissionKey } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import { cn, initials, toFaDigits } from "@/lib/utils";

import { LogoutButton } from "./logout-button";

type NavItem = {
  href: string;
  title: string;
  permission: PermissionKey;
  icon: React.ReactNode;
  badgeKey?: "orders" | "messages";
};

const icon = (d: string) => (
  <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "عملیات",
    items: [
      {
        href: "/admin",
        title: "داشبورد",
        permission: "dashboard",
        icon: icon("M3 10.5 10 4l7 6.5M5 9.5V16h10V9.5"),
      },
      {
        href: "/admin/orders",
        title: "سفارش‌ها و استعلام‌ها",
        permission: "orders",
        badgeKey: "orders",
        icon: icon("M4 3h9l3 3v11H4zM7 8h6M7 11.5h6M7 15h3"),
      },
      {
        href: "/admin/customers",
        title: "مشتریان",
        permission: "customers",
        icon: icon("M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 16.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5M13.5 8.5a2 2 0 1 0 0-4M14 12.2c2 .4 3.5 2.1 3.5 4.3"),
      },
      {
        href: "/admin/messages",
        title: "پیام‌های تماس",
        permission: "messages",
        badgeKey: "messages",
        icon: icon("M2.5 5.5h15v9h-15zM3 6l7 4.5L17 6"),
      },
    ],
  },
  {
    label: "کاتالوگ",
    items: [
      {
        href: "/admin/products",
        title: "محصولات",
        permission: "products",
        icon: icon("M10 2.5 17 6v8l-7 3.5L3 14V6zM3 6l7 3.5L17 6M10 9.5v8"),
      },
      {
        href: "/admin/categories",
        title: "دسته‌بندی‌ها",
        permission: "categories",
        icon: icon("M3 4.5h5v5H3zM12 4.5h5v5h-5zM3 10.5h5v5H3zM12 10.5h5v5h-5z"),
      },
      {
        href: "/admin/specs",
        title: "مشخصات فنی",
        permission: "products",
        icon: icon("M3 5h14M3 10h14M3 15h9M15.5 13.5v4M13.5 15.5h4"),
      },
      {
        href: "/admin/brands",
        title: "برندها",
        permission: "brands",
        icon: icon("M4 4h6l6 6-6 6-6-6zM7 7h.01"),
      },
    ],
  },
  {
    label: "محتوا",
    items: [
      {
        href: "/admin/posts",
        title: "اخبار و مقالات",
        permission: "posts",
        icon: icon("M4 3.5h9l3 3v10H4zM7 8h6M7 11h6M7 14h4"),
      },
      {
        href: "/admin/projects",
        title: "پروژه‌ها",
        permission: "projects",
        icon: icon("M3 16.5V8l7-4.5L17 8v8.5M7.5 16.5v-5h5v5"),
      },
    ],
  },
  {
    label: "سیستم",
    items: [
      {
        href: "/admin/users",
        title: "کاربران پنل",
        permission: "users",
        icon: icon("M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 17c0-3 2.7-5 6-5s6 2 6 5"),
      },
      {
        href: "/admin/settings",
        title: "تنظیمات",
        permission: "settings",
        icon: icon("M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.6 2.8h2.8l.4 2 1.7 1 1.9-.7 1.4 2.4-1.5 1.3v2l1.5 1.3-1.4 2.4-1.9-.7-1.7 1-.4 2H8.6l-.4-2-1.7-1-1.9.7-1.4-2.4L4.7 12v-2L3.2 8.7l1.4-2.4 1.9.7 1.7-1z"),
      },
      {
        href: "/admin/logs",
        title: "لاگ فعالیت‌ها",
        permission: "logs",
        icon: icon("M4 3.5h12v13H4zM7 7h6M7 10h6M7 13h3"),
      },
    ],
  },
];

const ReadOnlyContext = React.createContext(false);

/** نقش فقط-خواندنی: دکمه‌های تغییر نباید نمایش داده شوند. سرور مستقل بررسی می‌کند. */
export function useReadOnly() {
  return React.useContext(ReadOnlyContext);
}

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: SessionUser;
  counts: { orders: number; messages: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // بستن منوی موبایل هنگام تغییر مسیر — تنظیم state در زمان رندر
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  const sidebar = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--border-hairline)] px-5">
        <Logomark className="size-8 text-[var(--brand)]" />
        <div className="min-w-0 leading-none">
          <p className="truncate font-display text-sm font-bold">{siteConfig.name}</p>
          <p className="mt-1 font-mono text-label tracking-[0.2em] text-[var(--fg-subtle)]">
            ADMIN CONSOLE
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="ناوبری پنل">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => can(user.role, item.permission));
          if (items.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-2 px-3 font-mono text-micro tracking-[0.12em] text-[var(--fg-subtle)]">
                {group.label.toUpperCase()}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  const badge = item.badgeKey ? counts[item.badgeKey] : 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-meta transition-all duration-200",
                          active
                            ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                            : "text-[var(--fg-secondary)] hover:bg-[var(--bg-elev-3)] hover:text-[var(--fg-primary)]",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute inset-y-1.5 -start-3 w-0.5 rounded-full bg-[var(--brand)] transition-transform duration-300",
                            "[transition-timing-function:var(--ease-out-expo)]",
                            active ? "scale-y-100" : "scale-y-0",
                          )}
                          aria-hidden
                        />
                        <span className={active ? "text-[var(--brand)]" : "text-[var(--fg-subtle)]"}>
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.title}</span>
                        {badge > 0 && (
                          <span className="grid min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1.5 py-0.5 font-mono text-micro font-bold text-[var(--fg-on-brand)]">
                            {toFaDigits(badge)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--border-hairline)] p-3">
        <div className="flex items-center gap-3 rounded-md p-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] font-display text-xs font-bold text-[var(--brand)]">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-meta font-medium">{user.name}</p>
            <p className="truncate text-micro text-[var(--fg-subtle)]">
              {USER_ROLE[user.role].label}
            </p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-[var(--bg-base)]">
      {/* نوار کناری دسکتاپ */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-[var(--border-subtle)] bg-[var(--bg-elev-1)] lg:flex">
        {sidebar}
      </aside>

      {/* کشوی موبایل */}
      <div
        className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute inset-y-0 end-0 flex w-72 flex-col border-s border-[var(--border-subtle)] bg-[var(--bg-elev-1)] transition-transform duration-400",
            "[transition-timing-function:var(--ease-out-expo)]",
            mobileOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
          )}
        >
          {sidebar}
        </aside>
      </div>

      {/* ناحیه محتوا */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="باز کردن منو"
            className="grid size-9 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--fg-secondary)] lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
            </svg>
          </button>

          <div className="ms-auto flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex h-9 items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 text-xs text-[var(--fg-secondary)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M6 3h7v7M13 3 6.5 9.5M11 10.5V13H3V5h2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              مشاهده سایت
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <ReadOnlyContext.Provider value={isReadOnly(user.role)}>{children}</ReadOnlyContext.Provider>
        </main>
      </div>
    </div>
  );
}
