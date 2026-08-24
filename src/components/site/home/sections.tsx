import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { DomainIcon } from "@/components/ui/icons";
import { Section, SectionHeading } from "@/components/site/section";
import { SolutionCard } from "@/components/site/solution-card";
import { cn, formatDate, toFaDigits, truncate } from "@/lib/utils";
import type { CategoryNode } from "@/modules/catalog/queries";
import type { SiteSettings } from "@/modules/settings/queries";
import type { SolutionSummary } from "@/modules/solutions/queries";

/* -------------------------------------------------------------------------- */
/*  دسته‌بندی‌ها — چیدمان بنتو                                                 */
/* -------------------------------------------------------------------------- */

/**
 * دسته‌بندی‌ها با سلسله‌مراتب.
 *
 * پنج دسته نمایش داده می‌شود، نه شش‌تای هم‌اندازه: اولی یک کاشی بزرگ ۲×۲ با
 * تیتر و توضیح کامل، چهار تای بعدی کاشی‌های فشرده. بریف صراحتاً می‌گوید همه
 * دسته‌ها نباید کارت گرد یکسان باشند. بقیه دسته‌ها از «همه محصولات» در دسترس‌اند.
 */
export function CategoriesSection({ categories }: { categories: CategoryNode[] }) {
  const featured = categories.filter((c) => c.isFeatured).slice(0, 5);
  const [lead, ...rest] = featured;
  if (!lead) return null;

  return (
    <Section id="categories">
      <div className="shell">
        <SectionHeading
          eyebrow="دسته‌بندی محصولات"
          title="از پمپ تا آخرین اتصال، همه از یک تأمین‌کننده"
          description="کاتالوگ ما بر اساس کاربرد مهندسی دسته‌بندی شده، نه بر اساس برند. یعنی سریع‌تر به چیزی می‌رسید که واقعاً لازم دارید."
          action={{ label: "همه محصولات", href: "/products" }}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          <Reveal variant="up" className="lg:col-span-2 lg:row-span-2">
            <CategoryTile category={lead} lead />
          </Reveal>
          {rest.map((category, index) => (
            <Reveal key={category.id} delay={(index + 1) * 70} variant="up" className="h-full">
              <CategoryTile category={category} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** یک کاشی دسته‌بندی. حالت `lead` نسخه بزرگ‌تر با تایپوگرافی درشت‌تر است. */
function CategoryTile({ category, lead }: { category: CategoryNode; lead?: boolean }) {
  return (
    <Link
      href={`/products?category=${category.slug}`}
      className={cn(
        "brackets group relative flex h-full flex-col overflow-hidden rounded-lg border",
        "border-[var(--border-subtle)] bg-[var(--bg-elev-1)] transition-all duration-500",
        "[transition-timing-function:var(--ease-out-expo)] hover:-translate-y-1",
        "hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]",
        lead ? "p-7 sm:p-9" : "p-5 sm:p-6",
      )}
    >
      {/* پس‌زمینه شبکه‌ای که هنگام هاور روشن می‌شود */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(to left, var(--grid-line-strong) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line-strong) 1px, transparent 1px)",
          backgroundSize: lead ? "34px 34px" : "22px 22px",
        }}
        aria-hidden
      />

      <span
        className={cn(
          "relative grid shrink-0 place-items-center rounded-lg border border-[var(--border-subtle)]",
          "bg-[var(--bg-elev-2)] text-[var(--brand-text)] transition-all duration-500",
          "group-hover:scale-105 group-hover:border-[var(--border-brand)] group-hover:bg-[var(--brand-soft)]",
          lead ? "mb-7 size-16" : "mb-4 size-11",
        )}
      >
        <DomainIcon name={category.icon} className={lead ? "size-8" : "size-[22px]"} />
      </span>

      <h3
        className={cn(
          "relative font-display font-bold transition-colors group-hover:text-[var(--brand-text)]",
          lead ? "mb-3 text-display-2" : "mb-1.5 text-base",
        )}
      >
        {category.name}
      </h3>

      {category.description && (
        <p
          className={cn(
            "relative text-[var(--fg-muted)]",
            lead ? "mb-2 max-w-md text-lead" : "clamp-2 text-meta",
          )}
        >
          {category.description}
        </p>
      )}

      <div
        className={cn(
          // mt-auto تا در کاشی بزرگ، فوتر به کف بچسبد و فضای خالی زیرش نماند
          "relative mt-auto flex items-center justify-between border-t border-[var(--border-hairline)]",
          lead ? "pt-5" : "pt-3",
        )}
      >
        <span className="font-mono text-micro text-[var(--fg-subtle)]">
          {toFaDigits(category.productCount)} کالا
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 font-medium text-[var(--brand-text)] transition-all duration-300 group-hover:gap-3",
            lead ? "text-sm" : "text-micro",
          )}
        >
          مشاهده
          <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  راهکارها                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * ورود به کاتالوگ از مسیر «مسئله» به‌جای «نام محصول».
 *
 * ترکیب عمداً نامتقارن است: یک راهکار شاخص بزرگ در یک ستون و بقیه به‌صورت
 * فهرست فشرده در ستون کناری. روی موبایل، فهرست زیر کارت شاخص می‌نشیند و
 * ترتیب خواندن حفظ می‌شود.
 */
export function SolutionsSection({ summaries }: { summaries: SolutionSummary[] }) {
  if (summaries.length === 0) return null;

  const [lead, ...others] = summaries;

  return (
    <Section id="solutions" className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
      <div className="shell">
        <SectionHeading
          eyebrow="راهکارها"
          title="نام محصول را نمی‌دانید؟ از مسئله شروع کنید"
          description="تجهیزات را بر اساس کاربری دسته‌بندی کرده‌ایم تا بدون دانستن نام دقیق کالا، به چیزی که پروژه‌تان لازم دارد برسید."
          action={{ label: "همه راهکارها", href: "/solutions" }}
        />

        <div className="grid gap-4 lg:grid-cols-12">
          {lead && (
            <Reveal className="lg:col-span-5">
              <SolutionCard summary={lead} variant="feature" index={0} />
            </Reveal>
          )}

          {others.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:content-start">
              {others.map((summary, index) => (
                <Reveal key={summary.solution.slug} delay={80 + index * 70}>
                  <Link
                    href={`/solutions/${summary.solution.slug}`}
                    className="group flex h-full items-start gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 transition-all duration-400 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--brand)] transition-all duration-300 group-hover:border-[var(--border-brand)] group-hover:bg-[var(--brand-soft)]">
                      <DomainIcon name={summary.solution.icon} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold transition-colors group-hover:text-[var(--brand)]">
                        {summary.solution.name}
                      </span>
                      <span className="clamp-2 mt-1.5 block text-[0.75rem] leading-6 text-[var(--fg-muted)]">
                        {summary.solution.question}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  مزیت‌ها                                                                     */
/* -------------------------------------------------------------------------- */

const advantages = [
  {
    icon: "gauge",
    title: "انتخاب بر پایه محاسبه",
    body: "پیش از هر پیشنهاد، هد و دبی موردنیاز پروژه شما محاسبه می‌شود. پمپ بزرگ‌تر از نیاز، هم گران‌تر است هم پرمصرف‌تر.",
  },
  {
    icon: "certificate",
    title: "کالای اصل با گارانتی",
    body: "همه کالاها با گارانتی رسمی نمایندگی و مدارک اصالت عرضه می‌شوند. شماره سریال هر دستگاه در فاکتور ثبت می‌شود.",
  },
  {
    icon: "install",
    title: "نصب و راه‌اندازی تخصصی",
    body: "تیم فنی ما نصب، تنظیم فشار و آموزش بهره‌برداری را انجام می‌دهد؛ نه فقط تحویل جعبه.",
  },
  {
    icon: "support",
    title: "پشتیبانی پس از فروش",
    body: "تأمین قطعات یدکی، سرویس دوره‌ای و پاسخ‌گویی فنی تا سال‌ها پس از خرید.",
  },
] as const;

/**
 * «چرا ما» — چیدمان تحریریه‌ای با تیتر در ستون کناری.
 *
 * پیش‌تر این بخش هم مثل بقیه «تیتر وسط‌چین + شبکه چهارستونی» بود. وقتی
 * پشت سر هم چند بخش با همین ریتم بیایند، صفحه به فهرست تبدیل می‌شود نه
 * روایت. اینجا تیتر در ستون سمت راست می‌چسبد و مزیت‌ها به‌صورت فهرست
 * عمودی با شماره‌های بزرگ در ستون کناری اسکرول می‌شوند.
 */
export function AdvantagesSection() {
  return (
    <Section blueprint className="border-y border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <Reveal>
            <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
              <SectionHeading
                eyebrow="چرا ما"
                title="فروشنده نیستیم، مشاور فنی‌ایم"
                description="تفاوت یک تأمین‌کننده خوب با یک فروشگاه، در چیزی است که پیش و پس از فروش اتفاق می‌افتد."
                align="stack"
              />
              <Link
                href="/services"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-text)] transition-all duration-300 hover:gap-3"
              >
                خدمات فنی ما
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                  <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </Reveal>

          <ul className="stack-divider">
            {advantages.map((item, index) => (
              <Reveal key={item.title} as="li" delay={index * 70}>
                <div className="group flex gap-5 py-7 first:pt-0 sm:gap-8">
                  <span
                    className="shrink-0 font-mono text-[1.75rem] font-bold leading-none text-[var(--fg-subtle)] transition-colors duration-500 group-hover:text-[var(--brand-text)] sm:text-[2.25rem]"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-text)] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-110">
                        <DomainIcon name={item.icon} className="size-5" />
                      </span>
                      <h3 className="font-display text-lg font-bold">{item.title}</h3>
                    </div>
                    {/* اندازه سطر محدود می‌شود؛ ستون فهرست پهن است و بدون
                        این سقف، خطوط برای خواندن راحت طولانی می‌شوند */}
                    <p className="max-w-[62ch] text-meta text-[var(--fg-muted)]">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  فرآیند سفارش                                                                */
/* -------------------------------------------------------------------------- */

const steps = [
  { title: "انتخاب و استعلام", body: "محصول را انتخاب و فرم استعلام را پر کنید. اگر مطمئن نیستید، فقط شرایط پروژه را بنویسید." },
  { title: "بررسی کارشناس", body: "کارشناس فنی مشخصات را بررسی و در صورت نیاز گزینه مناسب‌تر پیشنهاد می‌دهد." },
  { title: "اعلام قیمت و تأیید", body: "پیش‌فاکتور رسمی با قیمت، زمان تحویل و شرایط گارانتی برایتان ارسال می‌شود." },
  { title: "تحویل و راه‌اندازی", body: "ارسال به سراسر کشور و در صورت درخواست، نصب و راه‌اندازی توسط تیم فنی." },
] as const;

export function ProcessSection() {
  return (
    <Section>
      <div className="shell">
        <SectionHeading
          eyebrow="فرآیند خرید"
          title="از استعلام تا راه‌اندازی، چهار قدم"
          description="پرداخت آنلاین نداریم چون معتقدیم خرید تجهیزات صنعتی باید با یک گفت‌وگوی فنی همراه باشد، نه یک کلیک."
        />

        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* خط اتصال مراحل */}
          <span
            className="pointer-events-none absolute inset-x-0 top-6 hidden h-px bg-gradient-to-l from-transparent via-[var(--border-brand)] to-transparent lg:block"
            aria-hidden
          />

          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 90} as="li" className="relative">
              <div className="relative">
                <span className="relative z-10 mb-5 grid size-12 place-items-center rounded-full border border-[var(--border-brand)] bg-[var(--bg-base)] font-mono text-sm font-bold text-[var(--brand)]">
                  {toFaDigits(index + 1)}
                </span>
                <h3 className="mb-2.5 font-display text-base font-bold">{step.title}</h3>
                <p className="text-meta leading-7 text-[var(--fg-muted)]">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  برندها — نوار متحرک                                                        */
/* -------------------------------------------------------------------------- */

export function BrandsSection({
  brands,
}: {
  brands: { id: string; name: string; latinName: string | null; slug: string; country: string | null }[];
}) {
  if (brands.length === 0) return null;
  const loop = [...brands, ...brands];

  return (
    <Section className="border-y border-[var(--border-hairline)] bg-[var(--bg-elev-1)] py-14">
      <div className="shell mb-8">
        {/*
          عنوان قبلی «نمایندگی‌ها / برندهایی که به آن‌ها اعتماد می‌کنیم» بود که
          به‌طور ضمنی ادعای نمایندگی رسمی این برندها را می‌رساند. تا زمانی که
          قرارداد نمایندگی واقعی وجود نداشته باشد، عنوان صرفاً واقعیت کاتالوگ را
          بیان می‌کند.
        */}
        <SectionHeading
          eyebrow="برندها"
          title="برندهای موجود در کاتالوگ"
          className="mb-0"
          action={{ label: "همه برندها", href: "/brands" }}
        />
      </div>

      {/* نوار متحرک — با هاور متوقف می‌شود و در حالت reduced-motion ساکن است */}
      <div
        className="group relative overflow-hidden"
        style={{
          maskImage: "linear-gradient(to left, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to left, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <div
          className="flex w-max gap-3 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animation: "aria-marquee 42s linear infinite" }}
        >
          {loop.map((brand, index) => (
            <Link
              key={`${brand.id}-${index}`}
              href={`/brands/${brand.slug}`}
              className="flex h-24 w-52 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)]"
            >
              <span className="font-display text-base font-bold text-[var(--fg-primary)]">{brand.name}</span>
              {brand.latinName && (
                <span className="font-mono text-micro tracking-[0.18em] text-[var(--fg-subtle)]">
                  {brand.latinName.toUpperCase()}
                </span>
              )}
              {brand.country && (
                <span className="text-micro text-[var(--fg-muted)]">{brand.country}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  پروژه‌ها                                                                    */
/* -------------------------------------------------------------------------- */

export function ProjectsSection({
  projects,
}: {
  projects: {
    id: string;
    title: string;
    slug: string;
    client: string | null;
    location: string | null;
    year: string | null;
    capacity: string | null;
    summary: string | null;
    coverUrl: string | null;
  }[];
}) {
  if (projects.length === 0) return null;

  return (
    <Section>
      <div className="shell">
        <SectionHeading
          eyebrow="کارنامه اجرایی"
          title="پروژه‌هایی که تحویل داده‌ایم"
          description="از ایستگاه پمپاژ کشاورزی تا موتورخانه بیمارستان؛ رزومه ما در محل اجرا نوشته شده است."
          action={{ label: "همه پروژه‌ها", href: "/projects" }}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {projects.slice(0, 3).map((project, index) => (
            <Reveal key={project.id} delay={index * 90} variant="up">
              <article className="group relative h-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]">
                <div className="relative aspect-16/10 overflow-hidden bg-[var(--bg-inset)]">
                  {project.coverUrl && (
                    <Image
                      src={project.coverUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elev-1)] via-transparent to-transparent" aria-hidden />
                  {project.year && (
                    <span className="absolute end-3 top-3 rounded-full border border-[var(--border-brand)] bg-[var(--bg-glass-strong)] px-2.5 py-1 font-mono text-micro text-[var(--brand)] backdrop-blur-sm">
                      {project.year}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="mb-2 clamp-2 font-display text-base font-bold leading-7 transition-colors group-hover:text-[var(--brand)]">
                    {project.title}
                  </h3>
                  {project.summary && (
                    <p className="clamp-2 text-meta leading-7 text-[var(--fg-muted)]">
                      {project.summary}
                    </p>
                  )}
                  <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border-hairline)] pt-4 text-micro">
                    {project.location && (
                      <div>
                        <dt className="text-[var(--fg-subtle)]">موقعیت</dt>
                        <dd className="mt-0.5 font-medium text-[var(--fg-secondary)]">{project.location}</dd>
                      </div>
                    )}
                    {project.capacity && (
                      <div>
                        <dt className="text-[var(--fg-subtle)]">ظرفیت</dt>
                        <dd className="mt-0.5 font-medium text-[var(--fg-secondary)]">{project.capacity}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  اخبار                                                                       */
/* -------------------------------------------------------------------------- */

export function NewsSection({
  posts,
}: {
  posts: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string;
    coverUrl: string | null;
    readingMinutes: number;
    publishedAt: Date | null;
  }[];
}) {
  if (posts.length === 0) return null;

  return (
    <Section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
      <div className="shell">
        <SectionHeading
          eyebrow="دانش فنی"
          title="مقالات و اخبار"
          description="آنچه در سال‌ها اجرا یاد گرفته‌ایم، اینجا بدون رودربایستی می‌نویسیم."
          action={{ label: "همه مطالب", href: "/news" }}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {posts.slice(0, 3).map((post, index) => (
            <Reveal key={post.id} delay={index * 90}>
              <Link
                href={`/news/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]"
              >
                <div className="relative aspect-16/9 overflow-hidden bg-[var(--bg-inset)]">
                  {post.coverUrl && (
                    <Image
                      src={post.coverUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center gap-2.5 text-micro text-[var(--fg-subtle)]">
                    <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 font-medium text-[var(--brand)]">
                      {post.category}
                    </span>
                    <span>{formatDate(post.publishedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{toFaDigits(post.readingMinutes)} دقیقه</span>
                  </div>

                  <h3 className="mb-2 clamp-2 font-display text-[0.9375rem] font-bold leading-7 transition-colors group-hover:text-[var(--brand)]">
                    {post.title}
                  </h3>

                  {post.excerpt && (
                    <p className="clamp-3 text-meta leading-7 text-[var(--fg-muted)]">
                      {truncate(post.excerpt, 140)}
                    </p>
                  )}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  فراخوان پایانی                                                              */
/* -------------------------------------------------------------------------- */

export function CtaSection({ settings }: { settings: SiteSettings }) {
  return (
    <Section className="pb-0">
      <div className="shell">
        <Reveal variant="scale">
          <div className="blueprint blueprint-dense grain relative overflow-hidden rounded-2xl border border-[var(--border-brand)] bg-[var(--bg-elev-1)] px-6 py-14 text-center sm:px-12 sm:py-16">
            <div
              className="anim-drift pointer-events-none absolute -top-24 start-1/2 -z-10 size-[30rem] -translate-x-1/2 rounded-full blur-[100px]"
              style={{ background: "radial-gradient(circle, var(--glow-brand), transparent 70%)" }}
              aria-hidden
            />

            <p className="eyebrow mb-5">آماده شروع هستید؟</p>
            <h2 className="mx-auto max-w-2xl font-display text-[1.75rem] font-extrabold leading-tight sm:text-[2.25rem]">
              مشخصات پروژه‌تان را بفرستید، بقیه‌اش با ما
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[0.9375rem] leading-8 text-[var(--fg-muted)]">
              فرقی نمی‌کند یک پمپ خانگی می‌خواهید یا یک ایستگاه پمپاژ کامل؛ کارشناسان ما گزینه مناسب،
              قیمت و زمان تحویل را برایتان مشخص می‌کنند.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex h-[3.25rem] items-center gap-2.5 rounded-md bg-[var(--brand)] px-8 text-[0.9375rem] font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
              >
                ثبت درخواست مشاوره
              </Link>
              <a
                href={`tel:${settings.contact.phonesRaw[0]}`}
                className="inline-flex h-[3.25rem] items-center gap-2.5 rounded-md border border-[var(--border-default)] px-7 text-[0.9375rem] font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              >
                <span className="num">{settings.contact.phones[0]}</span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
