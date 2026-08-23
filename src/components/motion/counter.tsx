"use client";

import * as React from "react";

import { toFaDigits } from "@/lib/utils";

/**
 * شمارنده صعودی که فقط هنگام دیده‌شدن اجرا می‌شود.
 * از requestAnimationFrame و منحنی expo-out استفاده می‌کند تا حرکت
 * با بقیه سیستم حرکتی سایت یکدست باشد.
 */
export function Counter({
  value,
  duration = 1600,
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // پرش مستقیم به مقدار نهایی. از rAF استفاده می‌شود تا به‌جای یک رندر
      // آبشاری همگام داخل effect، در فریم بعدی اعمال شود.
      frame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          // expo-out — همان منحنی --ease-out-expo
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {toFaDigits(new Intl.NumberFormat("en-US").format(display))}
      {suffix}
    </span>
  );
}
