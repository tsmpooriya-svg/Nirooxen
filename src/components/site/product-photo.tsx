import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * =============================================================================
 *  قاب تصویر محصول
 * =============================================================================
 *  همان تمِ طرح‌های گرافیکی سایت — گرادیان روشن، شبکهٔ نقشه‌کشی، و درخشش
 *  فیروزه‌ای — پشت عکس واقعی محصول می‌نشیند.
 *
 *  نکتهٔ فنی که کل این کار به آن بستگی دارد: عکس‌های واقعی WebP بی‌شفافیت‌اند و
 *  پس‌زمینهٔ سفیدِ تو‌پر دارند. گذاشتن هر چیزی *پشتِ* آن‌ها هیچ تفاوتی نمی‌کرد،
 *  چون آن مستطیل سفید همه‌اش را می‌پوشاند. پس عکس با mix-blend-mode: multiply
 *  روی قاب ترکیب می‌شود: ضرب در سفید یعنی «دست نزن»، پس سفیدِ عکس ناپدید
 *  می‌شود و شبکه از زیرش بیرون می‌زند، در حالی که خود محصول رنگش را نگه می‌دارد.
 *
 *  همین نکته تکلیف حالت تیره را هم روشن می‌کند: قاب در هر دو تم روشن می‌ماند،
 *  چون multiply روی زمینهٔ تیره کل عکس را سیاه می‌کرد. در حالت تیره قاب کمی
 *  خنک‌تر و کم‌نورتر است تا در صفحهٔ تیره نزند توی چشم، ولی روشن می‌ماند —
 *  عکس محصول باید دیده شود، و این بهای آن است.
 *
 *  طرح‌های SVG قاب خودشان را درون فایل دارند، پس دست‌نخورده می‌مانند؛ ترکیب
 *  دوبارهٔ دو شبکهٔ ۲۴ پیکسلی که روی هم نیفتاده‌اند فقط آشفتگی می‌ساخت.
 * =============================================================================
 */

/** طرح گرافیکی است یا عکس واقعی؟ فقط SVGها طرح‌اند. */
export function isIllustration(url: string): boolean {
  return url.trim().toLowerCase().split("?")[0]!.endsWith(".svg");
}

/**
 * عکس چطور روی قاب بنشیند؟
 *
 *   plain    — مستطیل خودش را پر می‌کند؛ قاب دیده نمی‌شود
 *   multiply — پس‌زمینهٔ روشن با ترکیب پنهان می‌شود
 *   alpha    — پس‌زمینه هنگام آپلود برداشته شده؛ شفافیت خودش کار را کرده
 *
 * هر چیزی جز دو مقدار شناخته‌شده «plain» است. تصویری که هنوز بررسی نشده باید
 * مثل امروز دیده شود، نه اینکه خوش‌بینانه ترکیب شود و روی پس‌زمینهٔ تیره یک
 * مستطیل سیاه بسازد.
 */
type Fit = "plain" | "multiply" | "alpha";

function fitFor(url: string, backdrop?: string | null): Fit {
  if (isIllustration(url)) return "plain";
  if (backdrop === "cut") return "alpha";
  if (backdrop === "light") return "multiply";
  return "plain";
}

export function ProductPhoto({
  src,
  alt,
  sizes,
  priority,
  backdrop,
  className,
  imageClassName,
  pad = "6%",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  backdrop?: string | null;
  className?: string;
  imageClassName?: string;
  /** فاصلهٔ عکس از لبه — همان چیزی است که قاب را دیدنی می‌کند */
  pad?: string;
}) {
  const fit = fitFor(src, backdrop);

  return (
    <span
      className={cn("product-plate absolute inset-0", className)}
      data-fit={fit}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(fit === "plain" ? "object-cover" : "object-contain", imageClassName)}
        style={fit === "plain" ? undefined : { padding: pad }}
      />
    </span>
  );
}


/**
 * بندانگشتی با اندازهٔ ثابت — سبد، فهرست استعلام، و نتایج جست‌وجوی سریع.
 *
 * اینجا `next/image` به کار نمی‌رود چون اندازه کوچک و ثابت است و بهینه‌سازی
 * چیزی اضافه نمی‌کند. قاب اما لازم است: بدون آن، عکسِ سفید در پنل تیره یک
 * مربع سفید می‌شود.
 */
export function ProductThumb({
  src,
  backdrop,
  className,
}: {
  src: string;
  backdrop?: string | null;
  className?: string;
}) {
  const fit = fitFor(src, backdrop);
  return (
    <span
      className={cn("product-plate shrink-0 border border-[var(--border-hairline)]", className)}
      data-fit={fit}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        className={cn("size-full", fit === "plain" ? "object-cover" : "object-contain p-[7%]")}
      />
    </span>
  );
}
