import Link from "next/link";

import { Counter } from "@/components/motion/counter";
import { Reveal } from "@/components/motion/reveal";
import { DomainIcon } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import { toFaDigits } from "@/lib/utils";
import type { CategoryNode } from "@/modules/catalog/queries";
import type { SiteSettings } from "@/modules/settings/queries";

/**
 * هیرو — «مقطع فنی».
 *
 * ترکیب: تیتر بزرگ سمت راست، کارت مشخصات شبیه برگه دیتاشیت سمت چپ،
 * شبکه بلوپرینت و دو هاله نورانی که آرام جابه‌جا می‌شوند. همه انیمیشن‌ها
 * CSS محض هستند تا در اولین رنگ‌آمیزی بدون هزینه JS اجرا شوند.
 */
export function Hero({
  categories,
  settings,
}: {
  categories: CategoryNode[];
  settings: SiteSettings;
}) {
  return (
    <section className="blueprint relative overflow-hidden border-b border-[var(--border-hairline)] pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-28">
      {/* هاله‌های محیطی */}
      <div
        className="anim-drift pointer-events-none absolute -start-24 -top-32 -z-10 size-[34rem] rounded-full opacity-70 blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--glow-brand), transparent 68%)" }}
        aria-hidden
      />
      <div
        className="anim-drift pointer-events-none absolute -end-32 top-40 -z-10 size-[26rem] rounded-full opacity-60 blur-[120px] [animation-delay:-8s]"
        style={{ background: "radial-gradient(circle, var(--glow-signal), transparent 70%)" }}
        aria-hidden
      />

      <div className="shell">
        {/*
          عمداً نامتقارن: ستون متن حدود ۱.۵ برابر ستون کارت است و کارت با
          فاصله از بالا پایین‌تر می‌نشیند. ترکیب دو ستونِ هم‌وزن و وسط‌چین،
          تیتر را از موضع اصلی بودن خارج می‌کرد.
        */}
        <div className="grid items-start gap-12 lg:grid-cols-[1.75fr_1fr] lg:gap-16">
          {/* ستون متن */}
          <div>
            <Reveal>
              {/* opaque chip, not --brand-soft: this pill sits over the hero's
                  blueprint grid and glow, which darkened the translucent fill
                  enough to drop the label to 4.41:1 */}
              <p className="eyebrow mb-6 inline-flex items-center gap-2.5 rounded-full border border-[var(--border-brand)] bg-[var(--brand-chip)] px-4 py-2">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--brand)] opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[var(--brand)]" />
                </span>
                {siteConfig.foundedYear
                  ? `از ${toFaDigits(siteConfig.foundedYear)} در کنار صنعت آب ایران`
                  : "تأمین تخصصی تجهیزات آب و آبرسانی"}
              </p>
            </Reveal>

            {/*
              تأکید فقط با رنگ برند. گرادیان روی متن، امضای بصری قالب‌های
              عمومی است و بریف کنارش گذاشته. زیرخطِ absolute هم امتحان شد و
              کنار رفت: وقتی عبارت در موبایل می‌شکند، خط زیر سطر اول می‌افتد
              و شبیه خط‌خوردگی می‌شود.
            */}
            <Reveal delay={80}>
              {/* text-wrap:normal لازم است — قانون پایه برای همه تیترها
                  balance می‌گذارد و آن، سطرها را حتی وقتی جا دارند دوباره
                  می‌شکند و <br>های دستی این تیتر را بی‌اثر می‌کند */}
              <h1 className="font-display text-display-1 font-extrabold [text-wrap:normal]">
                تجهیزات آبرسانی
                <br />
                <span className="text-[var(--brand)]">انتخاب‌شده توسط مهندس</span>
                <br />
                نه توسط الگوریتم
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-8 max-w-[46ch] text-lead text-[var(--fg-muted)]">
                پمپ، مخزن، شیرآلات و اتصالات صنعتی از برندهای معتبر جهانی و داخلی. هر سفارش پیش از
                ثبت، توسط کارشناس فنی بررسی می‌شود تا مطمئن باشید آنچه می‌خرید دقیقاً به کار
                پروژه‌تان می‌آید.
              </p>
            </Reveal>

            <Reveal delay={240}>
              {/* روی موبایل تمام‌عرض و هم‌اندازه؛ flex-wrap قبلی دو دکمه با
                  عرض‌های متفاوت و پلکانی می‌ساخت */}
              <div className="mt-10 flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:items-center">
                <Link
                  href="/products"
                  className="group inline-flex h-[3.25rem] items-center justify-center gap-2.5 rounded-md bg-[var(--brand)] px-7 text-[0.9375rem] font-medium text-[var(--fg-on-brand)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
                >
                  مشاهده کاتالوگ محصولات
                  <svg
                    viewBox="0 0 16 16"
                    className="size-4 rotate-180 transition-transform duration-300 group-hover:-translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>

                <a
                  href={`tel:${settings.contact.mobileRaw}`}
                  className="inline-flex h-[3.25rem] items-center justify-center gap-2.5 rounded-md border border-[var(--border-default)] px-6 text-[0.9375rem] font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                >
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path d="M3 2.5h2.5l1 3-1.6 1a8 8 0 0 0 3.6 3.6l1-1.6 3 1V13a1 1 0 0 1-1.1 1A11 11 0 0 1 2 3.6 1 1 0 0 1 3 2.5Z" />
                  </svg>
                  مشاوره فنی رایگان
                </a>
              </div>
            </Reveal>

            {/* آمار — تنها زمانی رندر می‌شود که داده واقعی در siteConfig.stats باشد */}
            {siteConfig.stats.length > 0 && (
              <Reveal delay={320}>
                <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-[var(--border-hairline)] pt-8 sm:grid-cols-4">
                  {siteConfig.stats.map((stat) => (
                    // ترتیب DOM «عنوان → مقدار» است تا screen reader درست بخواند؛
                    // flex-col-reverse فقط ترتیب بصری را برعکس می‌کند.
                    <div key={stat.label} className="flex flex-col-reverse">
                      <dt className="mt-2 text-xs leading-5 text-[var(--fg-muted)]">{stat.label}</dt>
                      <dd className="font-display text-[1.75rem] font-extrabold leading-none text-[var(--brand)]">
                        <Counter value={stat.value} suffix={stat.suffix} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>

          {/* ستون کارت دیتاشیت — پایین‌تر از خط بالایی تیتر می‌نشیند */}
          <Reveal variant="scale" delay={200} className="relative lg:mt-20">
            <div className="edge-lit grain relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-[var(--shadow-xl)] sm:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-[var(--border-hairline)] pb-4">
                <div>
                  <p className="font-mono text-micro tracking-[0.2em] text-[var(--fg-subtle)]">
                    PRODUCT CATEGORIES
                  </p>
                  <p className="mt-1.5 font-display text-lg font-bold">دسته‌بندی تجهیزات</p>
                </div>
                <span className="grid size-11 place-items-center rounded-md border border-[var(--border-brand)] bg-[var(--brand-soft)] text-[var(--brand)]">
                  <DomainIcon name="gauge" className="size-5" />
                </span>
              </div>

              <ul className="space-y-1">
                {categories.slice(0, 6).map((category, index) => (
                  <li key={category.id}>
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="group flex items-center gap-3.5 rounded-md p-2.5 transition-colors duration-300 hover:bg-[var(--bg-elev-3)]"
                      style={{ animationDelay: `${400 + index * 60}ms` }}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--brand)] transition-all duration-300 group-hover:border-[var(--border-brand)] group-hover:bg-[var(--brand-soft)]">
                        <DomainIcon name={category.icon} className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-medium text-[var(--fg-primary)] transition-colors group-hover:text-[var(--brand)]">
                          {category.name}
                        </span>
                        <span className="mt-1 block font-mono text-micro text-[var(--fg-subtle)]">
                          {toFaDigits(category.productCount)} قلم کالا
                        </span>
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        className="size-3.5 shrink-0 text-[var(--fg-subtle)] transition-all duration-300 group-hover:-translate-x-1 group-hover:text-[var(--brand)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden
                      >
                        <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                href="/products"
                className="mt-5 flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] text-sm font-medium text-[var(--fg-secondary)] transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              >
                همه دسته‌بندی‌ها
              </Link>
            </div>

            {/* خط‌کش تزئینی — حس نقشه فنی */}
            <div
              className="pointer-events-none absolute -bottom-5 -start-5 -z-10 hidden h-24 w-24 border-b border-s border-[var(--border-brand)] lg:block"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -end-5 -top-5 -z-10 hidden h-24 w-24 border-e border-t border-[var(--border-brand)] lg:block"
              aria-hidden
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
