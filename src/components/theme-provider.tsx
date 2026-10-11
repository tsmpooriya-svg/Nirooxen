"use client";

import * as React from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "nirooxen-theme";
/* راهنمای یک‌بارهٔ حالت تیره — جدا از کلید تم، چون «دیده شد» با «انتخاب کرد» فرق دارد */
const HINT_KEY = "nirooxen-theme-hint";
const HINT_DELAY_MS = 5000;
const HINT_LIFETIME_MS = 15000;

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
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="dark"&&t!=="light"){t="light"}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;

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
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  },
};

export function ThemeProvider({
  children,
  defaultTheme = "light",
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
        /* وقتی راهنما باز است خودِ کلید هم برجسته می‌شود؛ متن می‌گوید «آن کلید»
           و کاربر باید بتواند بدون جست‌وجو پیدایش کند */
        "[html[data-theme-hint=on]_&]:border-[var(--border-brand)] " +
        "[html[data-theme-hint=on]_&]:text-[var(--brand)] " +
        "motion-safe:[html[data-theme-hint=on]_&]:animate-[aria-pulse-ring_1.8s_ease-out_infinite] " +
        "[html[data-theme-hint=on]_&]:shadow-[0_0_0_3px_var(--brand-soft)] " +
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

/* -------------------------------------------------------------------------- */
/*  راهنمای حالت تیره                                                          */
/* -------------------------------------------------------------------------- */
/**
 * سایت برای بازدیدکنندهٔ تازه روشن باز می‌شود. چون کلید تم یک آیکون کوچک در
 * نوار بالاست، وجود حالت تیره به‌سادگی از چشم می‌افتد؛ این کارت یک‌بار آن را
 * نشان می‌دهد و بعد دیگر برنمی‌گردد.
 *
 * شرط‌ها: فقط وقتی کاربر هنوز تمی انتخاب نکرده و این راهنما را ندیده باشد. روی
 * صفحه‌هایی که پالت خودشان را تحمیل می‌کنند (مثل آتش‌نشانی) نشان داده نمی‌شود،
 * چون آنجا تغییر تم هیچ اثر دیداری ندارد و کاربر فکر می‌کند کلید کار نمی‌کند.
 */
export function ThemeHint() {
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);

  const close = React.useCallback(() => {
    setOpen(false);
    document.documentElement.removeAttribute("data-theme-hint");
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* حالت خصوصی مرورگر — بی‌اهمیت */
    }
  }, []);

  React.useEffect(() => {
    let chosen: string | null = null;
    let seen: string | null = null;
    try {
      chosen = window.localStorage.getItem(STORAGE_KEY);
      seen = window.localStorage.getItem(HINT_KEY);
    } catch {
      return; // بدون حافظه نمی‌توان «یک‌بار» را تضمین کرد، پس اصلاً نشان نمی‌دهیم
    }
    if (chosen || seen) return;
    if (document.querySelector(".ember-scope")) return;

    const show = window.setTimeout(() => {
      setOpen(true);
      document.documentElement.setAttribute("data-theme-hint", "on");
    }, HINT_DELAY_MS);
    return () => window.clearTimeout(show);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const hide = window.setTimeout(close, HINT_LIFETIME_MS);
    return () => window.clearTimeout(hide);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-[120] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elev-2)] p-4 shadow-[var(--shadow-brand)] motion-safe:animate-[aria-pop_var(--dur-slow)_var(--ease-out-expo)_both] sm:inset-x-auto sm:bottom-6 sm:end-6 sm:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">حالت تیره هم دارید</p>
          <p className="mt-1.5 text-[13px] leading-6 text-[var(--fg-muted)]">
            سایت برای شما روشن باز شده است. با کلید ماه — در نوار بالا، و در موبایل
            داخل منو — هر وقت خواستید بین روشن و تیره جابه‌جا شوید.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTheme("dark");
                close();
              }}
              className="h-9 rounded-md bg-[var(--brand)] px-4 text-xs font-semibold text-[var(--fg-on-brand)] transition-colors duration-300 hover:bg-[var(--brand-hover)]"
            >
              همین حالا تیره کن
            </button>
            <button
              type="button"
              onClick={close}
              className="h-9 rounded-md px-3 text-xs font-medium text-[var(--fg-muted)] transition-colors duration-300 hover:text-[var(--fg-primary)]"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
