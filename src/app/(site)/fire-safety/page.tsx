import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { ProductCard } from "@/components/site/product-card";
import { Section, SectionHeading } from "@/components/site/section";
import { siteConfig } from "@/config/site";
import { JsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl, toFaDigits } from "@/lib/utils";
import { getCategoryTree, listProducts } from "@/modules/catalog/queries";

export const revalidate = 3600;

const ROOT_SLUG = "fire-safety";

export const metadata: Metadata = pageMetadata({
  title: "تجهیزات آتش‌نشانی و ایمنی",
  description:
    "کپسول، جعبه، شلنگ، اسپرینکلر، اعلام حریق، کوپلینگ و تجهیزات حفاظت فردی — " +
    "دسته‌بندی‌شده بر اساس کلاس آتش و کاربرد ساختمانی و صنعتی.",
  path: "/fire-safety",
});

/* -------------------------------------------------------------------------- */
/*  کلاس‌های آتش                                                                */
/* -------------------------------------------------------------------------- */
/**
 * جدول کلاس آتش، ستون فقرات این صفحه است. انتخاب خاموش‌کننده اشتباه، بدتر از
 * نداشتن آن است — آب روی برق و روغن، خطر را بزرگ‌تر می‌کند. پس به‌جای فهرست
 * ساده محصولات، اول همین تصمیم را روشن می‌کنیم و بعد به دستهٔ درست وصل می‌کنیم.
 */
const FIRE_CLASSES = [
  {
    code: "A",
    title: "جامدات سوختنی",
    examples: "چوب، کاغذ، پارچه، زباله خشک",
    agent: "آب و گاز، پودر ABC، یونیورسال",
    href: "/products?category=fire-extinguishers",
  },
  {
    code: "B",
    title: "مایعات قابل اشتعال",
    examples: "بنزین، حلال، رنگ، الکل",
    agent: "پودر، فوم، CO2",
    href: "/products?category=fire-extinguishers",
  },
  {
    code: "C",
    title: "گازهای قابل اشتعال",
    examples: "گاز شهری، متان، پروپان",
    agent: "پودر — پس از قطع منبع گاز",
    href: "/products?category=fire-extinguishers",
  },
  {
    code: "E",
    title: "تجهیزات برق‌دار",
    examples: "تابلو برق، سرور، موتور",
    agent: "CO2، گاز تمیز، آیروسل",
    href: "/products?category=fire-extinguishers",
  },
  {
    code: "F",
    title: "روغن و چربی پخت‌وپز",
    examples: "سرخ‌کن صنعتی، آشپزخانه رستوران",
    agent: "پتوی نسوز، مواد مخصوص آشپزخانه",
    href: "/products?category=fire-ppe",
  },
];

/* -------------------------------------------------------------------------- */
/*  سناریوهای نصب                                                              */
/* -------------------------------------------------------------------------- */
const SCENARIOS = [
  {
    title: "ساختمان مسکونی و اداری",
    lead: "آنچه بازرسی ایمنی ساختمان سراغش را می‌گیرد",
    items: [
      "جعبه آتش‌نشانی با شلنگ، نازل و شیر فلکه ۱ و ۱/۲ اینچ",
      "کپسول پودر و گاز ۶ کیلویی در راه‌پله هر طبقه",
      "دتکتور دود در راهرو و دتکتور حرارتی در پارکینگ",
      "شستی و آژیر اعلام حریق کنار درهای خروج",
      "اسپرینکلر پایین‌زن ۶۸ درجه زیر سقف کاذب",
    ],
    href: "/products?category=fire-cabinets",
  },
  {
    title: "واحد صنعتی و انبار",
    lead: "حجم بیشتر، فاصله بیشتر، مادهٔ اطفای سنگین‌تر",
    items: [
      "هیدرانت و شلنگ برزنتی ۲ و ۱/۲ تا ۶ اینچ",
      "کپسول چرخ‌دار و کپسول‌های ۲۵ تا ۷۵ کیلویی",
      "مانیتور آب و کف با اینداکتور فوم",
      "اسپرینکلر بالازن با واکنش استاندارد",
      "لباس، کلاه و دستگاه تنفسی عملیاتی",
    ],
    href: "/products?category=fire-valves",
  },
  {
    title: "تابلو برق و اتاق سرور",
    lead: "جایی که خودِ مادهٔ اطفا نباید خسارت بزند",
    items: [
      "کپسول CO2 از ۳ کیلوگرم به بالا",
      "آیروسل مینیاتوری ۲۰ گرمی داخل تابلو",
      "سامانهٔ گاز تمیز FM200",
      "دتکتور دود و سنسور مونوکسید کربن",
      "کابل مقاوم حریق برای مدارهای حیاتی",
    ],
    href: "/products?category=fire-detection",
  },
];

/* -------------------------------------------------------------------------- */
/*  آیکون گروه‌ها                                                              */
/* -------------------------------------------------------------------------- */
/**
 * همان طرح‌هایی که روی کارت محصول هم می‌نشینند. فهرست یازده‌تایی گروه‌ها بدون
 * تصویر فقط یازده خط متن است؛ با آیکون، چشم گروه را از شکلش پیدا می‌کند نه از
 * خواندن. هر نامکی که اینجا نباشد به طرح عمومی می‌افتد.
 */
const GROUP_ICON: Record<string, string> = {
  "fire-extinguishers": "fire-extinguisher-powder",
  "fire-cabinets": "fire-cabinet",
  "fire-hoses-reels": "fire-hose-reel",
  "fire-nozzles": "fire-nozzle",
  "fire-valves": "fire-valve",
  "fire-sprinklers": "fire-sprinkler",
  "fire-detection": "fire-detector",
  "fire-ppe": "fire-ppe-helmet",
  "fire-tools": "fire-tool",
  "first-aid": "fire-first-aid",
  "safety-traffic": "fire-cone",
};

export default async function FireSafetyPage() {
  const tree = await getCategoryTree();
  const root = tree.find((c) => c.slug === ROOT_SLUG);
  const groups = root?.children ?? [];

  const { items: products, total } = await listProducts({
    category: ROOT_SLUG,
    pageSize: 8,
    sort: "newest",
  });

  return (
    <div className="ember-scope">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "تجهیزات آتش‌نشانی و ایمنی",
          description:
            "کپسول، جعبه، شلنگ، اسپرینکلر، اعلام حریق و تجهیزات حفاظت فردی.",
          url: absoluteUrl("/fire-safety", siteConfig.url),
          inLanguage: "fa-IR",
          isPartOf: { "@id": `${siteConfig.url}/#website` },
        }}
      />

      {/* ── سربرگ ─────────────────────────────────────────────────────────── */}
      <header className="ember-glow blueprint blueprint-dense grain relative overflow-hidden">
        <div className="hazard-band h-3 w-full" aria-hidden />

        <div className="shell py-16 sm:py-20 lg:py-28">
          <Reveal>
            <p className="eyebrow mb-4 flex items-center gap-2.5">
              <span className="inline-block h-px w-8 bg-[var(--brand)]" aria-hidden />
              خانواده تجهیزات آتش‌نشانی
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="font-display max-w-4xl text-[clamp(2rem,1.2rem+3.6vw,3.75rem)] font-extrabold leading-[1.15]">
              وقتی ثانیه‌ها می‌شمارند، تجهیزات باید
              <span className="text-[var(--brand)]"> سر جایشان </span>
              باشند
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-base leading-9 text-[var(--fg-secondary)]">
              از کپسول و جعبهٔ ساختمانی تا هیدرانت، مانیتور فوم و دستگاه تنفسی
              عملیاتی. هر کالا با مشخصات فنی، کلاس آتش و کاربردش فهرست شده است تا
              انتخاب بر اساس نوع حریق انجام شود، نه حدس.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="#groups"
                className="inline-flex h-12 items-center rounded-md bg-[var(--brand)] px-7 text-sm font-semibold text-[var(--fg-on-brand)] shadow-[var(--shadow-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)]"
              >
                گروه‌های کالا
              </Link>
              <Link
                href="#classes"
                className="inline-flex h-12 items-center rounded-md border border-[var(--border-strong)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              >
                کدام کپسول برای کدام آتش؟
              </Link>
            </div>
          </Reveal>

          {total > 0 && (
            <Reveal delay={320}>
              {/* عددها از خودِ کاتالوگ می‌آیند، نه از متن تبلیغاتی */}
              <dl className="mt-14 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--border-subtle)]">
                {[
                  { k: "کالای این خانواده", v: toFaDigits(total) },
                  { k: "گروه کالا", v: toFaDigits(groups.length) },
                  { k: "کلاس آتش", v: toFaDigits(FIRE_CLASSES.length) },
                ].map((stat) => (
                  <div
                    key={stat.k}
                    className="flex flex-col-reverse bg-[var(--bg-elev-1)] px-4 py-5 text-center"
                  >
                    <dt className="mt-1.5 text-xs text-[var(--fg-muted)]">{stat.k}</dt>
                    <dd className="font-display text-3xl font-extrabold text-[var(--brand)]">
                      {stat.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
        </div>
      </header>

      {/* ── کلاس‌های آتش ──────────────────────────────────────────────────── */}
      <Section id="classes" className="bg-[var(--bg-sunken)]">
        <div className="shell">
          <SectionHeading
            eyebrow="پیش از خرید"
            title="کدام ماده، کدام آتش"
            description="خاموش‌کنندهٔ نامناسب گاهی حریق را بزرگ‌تر می‌کند؛ آب روی برق‌دار و روغن داغ از همین دست است. کلاس آتشِ محیط را مشخص کنید، بعد سراغ کالا بروید."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIRE_CLASSES.map((fc, i) => (
              <Reveal key={fc.code} delay={i * 70}>
                <Link
                  href={fc.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 transition-all duration-300 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-brand)]"
                >
                  <span
                    className="hazard-band-sm absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="flex items-baseline justify-between">
                    {/* حرف کلاس، نشانهٔ استانداردِ روی خودِ کپسول است — بدون قاب،
                        همان‌طور که روی برچسب کپسول چاپ می‌شود */}
                    <span className="font-mono text-4xl font-bold text-[var(--brand)]">
                      {fc.code}
                    </span>
                    <span className="ember-index text-5xl font-bold">
                      {toFaDigits(i + 1)}
                    </span>
                  </div>
                  <h3 className="font-display mt-3 text-lg font-bold">{fc.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--fg-muted)]">
                    {fc.examples}
                  </p>
                  <p className="mt-4 border-t border-[var(--border-hairline)] pt-4 text-sm font-medium text-[var(--fg-secondary)]">
                    <span className="text-[var(--fg-subtle)]">ماده مناسب: </span>
                    {fc.agent}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ── گروه‌های کالا ─────────────────────────────────────────────────── */}
      <Section id="groups" blueprint>
        <div className="shell">
          <SectionHeading
            eyebrow="کاتالوگ"
            title="گروه‌های کالا"
            description="یازده گروه، از اطفای دستی تا اعلام حریق و تجهیزات فردی."
            action={{ label: "همه محصولات", href: `/products?category=${ROOT_SLUG}` }}
          />

          {groups.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g, i) => (
                <Reveal key={g.id} delay={i * 50}>
                  <Link
                    href={`/products?category=${g.slug}`}
                    className="group flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-3 pe-5 transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)]"
                  >
                    <span className="flex min-w-0 items-center gap-3.5">
                      {/* همان طرح‌های ۴۸۰×۳۶۰ کارت محصول‌اند و پس‌زمینه و شبکهٔ
                          خودشان را دارند؛ با نسبت اصلی نمایش داده می‌شوند، چون
                          در قاب مربعی کوچک فقط یک لکهٔ کم‌رنگ می‌شوند. طرح ثابت
                          و سبک است و بهینه‌سازی تصویر چیزی به آن اضافه نمی‌کند. */}
                      <span className="w-[4.5rem] shrink-0 overflow-hidden rounded-md border border-[var(--border-hairline)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/images/products/${GROUP_ICON[g.slug] ?? "fire-generic"}.svg`}
                          alt=""
                          width={480}
                          height={360}
                          loading="lazy"
                          className="block h-auto w-full"
                        />
                      </span>
                      <span className="truncate font-medium">{g.name}</span>
                    </span>
                    {g.productCount > 0 && (
                      <span className="shrink-0 rounded-full bg-[var(--brand-chip)] px-2.5 py-1 font-mono text-xs text-[var(--brand-text)]">
                        {toFaDigits(g.productCount)}
                      </span>
                    )}
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[var(--border-default)] p-8 text-center text-sm text-[var(--fg-muted)]">
              گروه‌های این خانواده هنوز منتشر نشده‌اند.
            </p>
          )}
        </div>
      </Section>

      {/* ── سناریوها ──────────────────────────────────────────────────────── */}
      <Section className="bg-[var(--bg-sunken)]">
        <div className="shell">
          <SectionHeading
            eyebrow="بر اساس محل نصب"
            title="چه چیزی لازم دارید"
            description="سه چیدمان رایج؛ نقطهٔ شروع، نه نسخهٔ نهایی. طراحی سامانه به نقشه و کاربری ساختمان بستگی دارد."
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {SCENARIOS.map((sc, i) => (
              <Reveal key={sc.title} delay={i * 90}>
                <div className="flex h-full flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-7">
                  <div className="hazard-band-sm mb-5 h-1.5 w-16 rounded-full" aria-hidden />
                  <h3 className="font-display text-xl font-bold">{sc.title}</h3>
                  <p className="mt-2 text-sm text-[var(--fg-muted)]">{sc.lead}</p>

                  <ul className="mt-6 flex-1 space-y-3">
                    {sc.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7">
                        <span
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]"
                          aria-hidden
                        />
                        <span className="text-[var(--fg-secondary)]">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={sc.href}
                    className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] transition-opacity hover:opacity-75"
                  >
                    دیدن کالاهای مرتبط
                    <span aria-hidden>←</span>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ── محصولات ───────────────────────────────────────────────────────── */}
      {products.length > 0 && (
        <Section>
          <div className="shell">
            <SectionHeading
              eyebrow="تازه‌ها"
              title="از این خانواده"
              action={{ label: "همه محصولات", href: `/products?category=${ROOT_SLUG}` }}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={i * 50}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── فراخوان ───────────────────────────────────────────────────────── */}
      <Section className="bg-[var(--bg-elev-3)]">
        <div className="shell">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elev-1)] p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  فهرست تجهیزات ساختمان‌تان را بفرستید
                </h2>
                <p className="mt-4 text-sm leading-8 text-[var(--fg-muted)]">
                  کاربری، متراژ و تعداد طبقات را بگویید تا سیاههٔ کالا بر اساس
                  کلاس آتش و محل نصب تنظیم شود.
                </p>
              </div>
              <Link
                href="/quote"
                className="inline-flex h-12 shrink-0 items-center rounded-md bg-[var(--brand)] px-8 text-sm font-semibold text-[var(--fg-on-brand)] shadow-[var(--shadow-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)]"
              >
                درخواست استعلام
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      <div className="hazard-band h-3 w-full" aria-hidden />
    </div>
  );
}
