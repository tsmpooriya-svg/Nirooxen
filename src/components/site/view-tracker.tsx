"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * =============================================================================
 *  گزارش بازدید صفحه
 * =============================================================================
 *  یک درخواست کوچک به ازای هر صفحه‌ای که واقعاً باز می‌شود. چیزی رندر نمی‌کند.
 *
 *  چرا از سمت مرورگر و نه سرور: در App Router بیشتر جابه‌جایی‌ها بدون بارگذاری
 *  دوباره انجام می‌شوند، پس شمارش سمت سرور فقط اولین صفحه را می‌دید. از طرف
 *  دیگر prefetch هم درخواست سرور تولید می‌کند بی‌آنکه کسی چیزی دیده باشد.
 *  usePathname دقیقاً همان چیزی را می‌گوید که روی صفحه است.
 * =============================================================================
 */
export function ViewTracker() {
  const pathname = usePathname();
  /*
    مسیر آخرین گزارش. در حالت توسعه، React هر افکت را دو بار اجرا می‌کند و
    بدون این نگهبان هر بازدید دو ردیف می‌شد.
  */
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || reported.current === pathname) return;
    reported.current = pathname;

    const body = JSON.stringify({
      path: pathname,
      // فقط در نخستین صفحه معنا دارد؛ در جابه‌جایی داخلی خودِ سایت است
      referrer: document.referrer || null,
    });

    /*
      sendBeacon درخواست را به صف مرورگر می‌سپارد و اگر کاربر همان لحظه صفحه را
      ببندد هم فرستاده می‌شود. fetch در آن لحظه لغو می‌شود، پس کوتاه‌ترین
      بازدیدها — که خودشان خبر مهمی‌اند — از قلم می‌افتادند.
    */
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/view", new Blob([body], { type: "application/json" }));
      return;
    }

    // مرورگر قدیمی: شکستش هم مهم نیست، آمار نباید چیزی را خراب کند
    void fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
