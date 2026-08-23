"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type RevealVariant = "up" | "left" | "right" | "scale" | "blur";

export type RevealProps = {
  children: React.ReactNode;
  variant?: RevealVariant;
  /** تأخیر بر حسب میلی‌ثانیه — برای ساخت پلکان */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header" | "aside";
  /** یک بار اجرا شود یا با هر بار ورود به viewport تکرار شود */
  once?: boolean;
  threshold?: number;
};

/**
 * ظاهرشدن با اسکرول.
 *
 * پیاده‌سازی با IntersectionObserver + کلاس CSS انجام می‌شود، نه با کتابخانه
 * انیمیشن؛ نتیجه صفر بایت JS اضافه در باندل و اجرای انیمیشن روی compositor
 * است. حالت اولیه در globals.css تعریف شده تا محتوا پیش از هیدریشن هم
 * جای درست خود را داشته باشد (بدون پرش layout).
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
  as: Tag = "div",
  once = true,
  threshold = 0.15,
}: RevealProps) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.classList.add("is-revealed");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove("is-revealed");
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal={variant}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}

/**
 * پلکان خودکار: به فرزندان مستقیم خود تأخیر تدریجی می‌دهد.
 * برای گریدهای محصول و لیست‌ها استفاده می‌شود.
 */
export function RevealGroup({
  children,
  className,
  step = 70,
  variant = "up",
  start = 0,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  variant?: RevealVariant;
  start?: number;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <Reveal variant={variant} delay={start + index * step}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
