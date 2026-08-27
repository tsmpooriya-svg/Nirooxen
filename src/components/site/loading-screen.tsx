"use client";

import * as React from "react";

import { Logomark } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";

/**
 * =============================================================================
 *  صفحه راه‌اندازی
 * =============================================================================
 *  نشانه‌گذاری این کامپوننت روی سرور رندر می‌شود، پس در همان اولین رنگ‌آمیزی و
 *  بدون اجرای هیچ جاوااسکریپتی دیده می‌شود. کل حرکت با CSS انجام می‌شود و
 *  هیچ کتابخانه انیمیشنی به پروژه اضافه نشده — همان روشی که `Reveal` و
 *  `Counter` هم از آن استفاده می‌کنند.
 *
 *  چرخه عمر:
 *    ۱. سرور لایه را رندر می‌کند (بدون FOUC، بدون پرش)
 *    ۲. کلاینت هیدریت می‌شود و منتظر سیگنال‌های واقعیِ آماده‌بودن می‌ماند:
 *         • رویداد load پنجره (یا readyState === "complete")
 *         • document.fonts.ready
 *       هیچ درصدی جعل نمی‌شود؛ نوار پایین صفحه صرفاً تایم‌لاین انیمیشن است
 *       نه ادعایی درباره بایت‌های دانلودشده.
 *    ۳. یک کف زمانی (۱۰۰۰ms) رعایت می‌شود تا ترکیب وسط حرکت قطع نشود و
 *       بارگذاری از کش هم به‌صورت یک فلش زشت دیده نشود.
 *    ۴. با رسیدن به آمادگی، `data-exit` گذاشته می‌شود و پس از پایان حرکت
 *       خروج، کامپوننت از درخت حذف می‌شود.
 *
 *  اگر جاوااسکریپت اصلاً اجرا نشود، انیمیشن `loader-failsafe` در CSS بعد از
 *  ۸ ثانیه لایه را کنار می‌برد. تنها راه خروج بدون JS همین است.
 * =============================================================================
 */

/**
 * کف نمایش. برابر با لحظه‌ای که کل ترکیب در CSS کامل می‌شود، تا لایه وسط
 * حرکت قطع نشود و بارگذاری از کش هم به‌صورت یک فلش زشت دیده نشود.
 */
const MIN_VISIBLE_MS = 1000;
/** باید با مدت انیمیشن `loader-out` در globals.css یکی باشد */
const EXIT_MS = 520;

const SEEN_KEY = "nirooxen-loader-seen";

function hasSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // حالت خصوصی مرورگر یا مسدودبودن ذخیره‌سازی — مثل «ندیده» رفتار می‌کنیم
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* بی‌اهمیت */
  }
}

/**
 * پیش از اولین رنگ‌آمیزی اجرا می‌شود و اگر لایه در همین نشست قبلاً دیده شده،
 * روی <html> نشان می‌گذارد تا CSS آن را از همان ابتدا مخفی کند.
 *
 * چرا اسکریپت جداگانه و نه فقط بررسی داخل کامپوننت؟ چون نشانه‌گذاری لایه روی
 * سرور رندر می‌شود؛ اگر تصمیم فقط در effect گرفته می‌شد، بازدیدکننده تکراری
 * یک فریم لایه را می‌دید و بعد ناپدید می‌شد — یعنی دقیقاً همان پرشی که
 * قرار بود نباشد.
 */
export const loaderGateScript = `(function(){try{if(sessionStorage.getItem("${SEEN_KEY}")==="1"){document.documentElement.setAttribute("data-loader","seen")}}catch(e){}})();`;

/** هیچ‌وقت تغییر نمی‌کند؛ خواندن یک‌باره است و نیازی به اشتراک واقعی ندارد */
const noopSubscribe = () => () => {};

export function LoadingScreen() {
  const [phase, setPhase] = React.useState<"visible" | "exiting" | "done">("visible");

  /*
   * آیا لایه در همین نشست قبلاً دیده شده؟
   *
   * با useSyncExternalStore خوانده می‌شود، دقیقاً مثل `useMounted` در همین
   * پروژه: اسنپ‌شات سرور همیشه false است تا HTML سرور لایه را داشته باشد و
   * رندر اول کلاینت هم با آن یکی باشد؛ بعد از هیدریشن مقدار واقعی می‌نشیند.
   * این مسیرِ مستندشده و بدون hydration mismatch است و برخلاف setState داخل
   * effect، رندر آبشاری هم نمی‌سازد.
   */
  const seen = React.useSyncExternalStore(noopSubscribe, hasSeen, () => false);

  React.useEffect(() => {
    if (seen) return;
    markSeen();

    const startedAt = performance.now();
    let exitTimer = 0;
    let doneTimer = 0;
    let cancelled = false;

    /** سیگنال‌های واقعی آماده‌بودن — نه تایمر ساختگی */
    const ready = Promise.all([
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true })),
      document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve(),
    ]);

    ready.then(() => {
      if (cancelled) return;
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      exitTimer = window.setTimeout(() => {
        if (cancelled) return;
        setPhase("exiting");
        doneTimer = window.setTimeout(() => {
          if (!cancelled) setPhase("done");
        }, EXIT_MS);
      }, remaining);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [seen]);

  /*
   * قفل اسکرول فقط از سمت جاوااسکریپت اعمال می‌شود و در cleanup حتماً برمی‌گردد.
   * اگر با CSS و از سمت سرور قفل می‌شد، نبودِ JS صفحه را برای همیشه قفل می‌کرد.
   */
  React.useEffect(() => {
    // بازدید تکراری هیچ‌وقت اسکرول را قفل نمی‌کند، حتی برای یک فریم
    if (seen || phase === "done") return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [seen, phase]);

  if (seen || phase === "done") return null;

  return (
    <div
      className="loader-root"
      data-exit={phase === "exiting"}
      /*
       * صفحه‌خوان‌ها این لایه را نمی‌خوانند: محتوای واقعی صفحه از قبل در DOM
       * هست و اعلام «در حال بارگذاری» فقط نویز اضافه می‌کرد. فوکوس هم به دام
       * نمی‌افتد چون هیچ عنصر قابل فوکوسی داخلش نیست.
       */
      aria-hidden="true"
    >
      <div className="loader-shell">
        <div className="loader-stage">
          {/* نشانه‌های اندازه‌گیری دور حلقه */}
          <svg className="loader-ticks" viewBox="0 0 100 100" aria-hidden>
            {Array.from({ length: 24 }, (_, i) => {
              const angle = (i * 360) / 24;
              const long = i % 6 === 0;
              return (
                <line
                  key={i}
                  x1="50"
                  y1={long ? 2 : 3.5}
                  x2="50"
                  y2={long ? 8 : 6}
                  transform={`rotate(${angle} 50 50)`}
                />
              );
            })}
          </svg>

          {/* حلقه فشار — با stroke-dashoffset کشیده می‌شود */}
          <svg className="loader-ring" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="48" />
          </svg>

          {/* نشان برند موجود پروژه — لوگوی تازه‌ای ساخته نشده */}
          <div className="loader-mark">
            <Logomark className="size-full" />
          </div>
        </div>

        {/* واژه‌نشان، با همان تایپوگرافی سایت */}
        <div className="loader-word">
          <p className="font-display text-[1.375rem] font-extrabold leading-none text-[var(--fg-primary)]">
            {siteConfig.name}
          </p>
          <p className="mt-2 font-mono text-label tracking-[0.34em] text-[var(--fg-subtle)]">
            {siteConfig.latinName.toUpperCase()}
          </p>
        </div>

        {/*
          نوار نازک وضعیت. عمداً بدون درصد است: اپلیکیشن پیشرفت واقعی بارگذاری
          را در اختیار ندارد و نمایش «۶۴٪» یعنی جعل عدد. این نوار فقط تایم‌لاین
          قطعی انیمیشن را نشان می‌دهد.
        */}
        <div className="loader-bar" />
      </div>
    </div>
  );
}
