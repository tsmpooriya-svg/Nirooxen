import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { Section } from "@/components/site/section";
import { SolutionCard } from "@/components/site/solution-card";
import { siteConfig } from "@/config/site";
import { JsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";
import { getSiteSettings } from "@/modules/settings/queries";
import { listSolutionSummaries } from "@/modules/solutions/queries";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "راهکارها",
  description:
    "بر اساس نیازتان تجهیزات را پیدا کنید: آبرسانی ساختمان، کشاورزی و آبیاری، صنعت، تخلیه فاضلاب، انتقال و ذخیره آب و تأسیسات موتورخانه.",
  path: "/solutions",
});

export default async function SolutionsPage() {
  const settings = await getSiteSettings();
  const summaries = await listSolutionSummaries();

  // ترکیب عمداً نامتقارن: دو راهکار اول بزرگ‌اند، بقیه در ریتم فشرده‌تر.
  const [first, second, ...rest] = summaries;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "راهکارها",
          description:
            "دسته‌بندی تجهیزات بر اساس کاربرد و نیاز پروژه، برای زمانی که نام دقیق محصول را نمی‌دانید.",
          url: absoluteUrl("/solutions", siteConfig.url),
          inLanguage: "fa-IR",
          isPartOf: { "@id": `${siteConfig.url}/#website` },
          hasPart: summaries.map(({ solution }) => ({
            "@type": "WebPage",
            name: solution.name,
            description: solution.summary,
            url: absoluteUrl(`/solutions/${solution.slug}`, siteConfig.url),
          })),
        }}
      />

      <PageHeader
        title="راهکارها"
        description="لازم نیست نام دقیق محصول را بدانید. از روی مسئله‌ای که دارید شروع کنید؛ ما تجهیزات مرتبط را کنار هم گذاشته‌ایم."
        crumbs={[{ name: "راهکارها", href: "/solutions" }]}
      />

      <Section>
        <div className="shell">
          {/* ردیف نامتقارن اول — ۷/۵ روی دسکتاپ، پشته‌شده روی موبایل */}
          <div className="grid gap-4 lg:grid-cols-12">
            {first && (
              <Reveal className="lg:col-span-7" delay={0}>
                <SolutionCard summary={first} variant="feature" index={0} headingLevel="h2" />
              </Reveal>
            )}
            {second && (
              <Reveal className="lg:col-span-5" delay={80}>
                <SolutionCard summary={second} variant="feature" index={1} headingLevel="h2" />
              </Reveal>
            )}
          </div>

          {/* بقیه راهکارها */}
          {rest.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((summary, i) => (
                <Reveal key={summary.solution.slug} delay={160 + i * 60}>
                  <SolutionCard summary={summary} index={i + 2} headingLevel="h2" />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* راهنمای انتخاب — برای کسی که هنوز نمی‌داند کدام راهکار مال اوست */}
      <Section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
        <div className="shell">
          <Reveal>
            <div className="edge-lit grain relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-8 sm:p-12">
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-16">
                <div>
                  <p className="eyebrow mb-4">مطمئن نیستید کدام؟</p>
                  <h2 className="font-display text-[1.5rem] font-bold leading-[1.5] tracking-tight sm:text-[1.875rem]">
                    شرایط پروژه‌تان را بگویید، ما تجهیز مناسب را پیشنهاد می‌دهیم
                  </h2>
                  <p className="mt-5 max-w-xl text-sm leading-8 text-[var(--fg-muted)]">
                    اگر نمی‌دانید مسئله شما در کدام دسته می‌گنجد، لازم نیست حدس بزنید. ارتفاع
                    ساختمان، مساحت زمین یا کاربری مورد نظرتان را برای کارشناسان ما بفرستید؛ گزینه
                    مناسب، قیمت و زمان تحویل مشخص می‌شود.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/quote"
                    className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--brand)] px-7 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
                  >
                    ثبت درخواست مشاوره
                  </Link>
                  <a
                    href={`tel:${settings.contact.mobileRaw}`}
                    className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                  >
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M3 2.5h2.5l1 3-1.6 1a8 8 0 0 0 3.6 3.6l1-1.6 3 1V13a1 1 0 0 1-1.1 1A11 11 0 0 1 2 3.6 1 1 0 0 1 3 2.5Z" />
                    </svg>
                    تماس با کارشناس
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
