"use client";

import * as React from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "nirooxen-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme باید داخل <ThemeProvider> استفاده شود.");
  return ctx;
}

/**
 * اسکریپت مسدودکننده که پیش از اولین رنگ‌آمیزی اجرا می‌شود و از پرش تم
 * (flash of wrong theme) جلوگیری می‌کند. عمداً کوچک و بدون وابستگی است.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(!t){t="dark"}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();`;

/**
 * منبع حقیقت تم، صفت `data-theme` روی <html> است — نه state ری‌اکت.
 * `themeScript` آن را پیش از اولین رنگ‌آمیزی تنظیم می‌کند، پس خواندن از DOM
 * هم با هیدریشن سازگار است و هم نیازی به setState داخل effect ندارد.
 */
const themeStore = {
  subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  },
  getSnapshot(): Theme {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  },
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  // مقدار سرور همیشه defaultTheme است؛ کلاینت بلافاصله از DOM می‌خواند.
  const theme = React.useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    () => defaultTheme,
  );

  const setTheme = React.useCallback((next: Theme) => {
    // تغییر صفت، خودبه‌خود از طریق MutationObserver به state منتشر می‌شود
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* حالت خصوصی مرورگر — بی‌اهمیت */
    }
  }, []);

  const toggle = React.useCallback(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
  }, [setTheme]);

  const value = React.useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * کلید تغییر تم.
 *
 * هر دو آیکون رندر می‌شوند و انتخاب بین آن‌ها با CSS بر اساس صفت
 * data-theme روی <html> انجام می‌گیرد — این کار از عدم تطابق هیدریشن
 * جلوگیری می‌کند، چون سرور نمی‌داند کاربر کدام تم را ذخیره کرده است.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="تغییر حالت روشن و تیره"
      title="تغییر حالت روشن و تیره"
      className={
        "group grid size-10 place-items-center rounded-md border border-[var(--border-subtle)] " +
        "text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-brand)] " +
        "hover:text-[var(--brand)] " +
        (className ?? "")
      }
    >
      <span className="relative grid size-[18px] place-items-center">
        {/* ماه — در تم تیره دیده می‌شود */}
        <svg
          viewBox="0 0 24 24"
          className="absolute size-[18px] rotate-0 scale-100 opacity-100 transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] [html[data-theme=light]_&]:-rotate-90 [html[data-theme=light]_&]:scale-0 [html[data-theme=light]_&]:opacity-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
        </svg>
        {/* خورشید — در تم روشن دیده می‌شود */}
        <svg
          viewBox="0 0 24 24"
          className="absolute size-[18px] rotate-90 scale-0 opacity-0 transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] [html[data-theme=light]_&]:rotate-0 [html[data-theme=light]_&]:scale-100 [html[data-theme=light]_&]:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
        </svg>
      </span>
    </button>
  );
}
