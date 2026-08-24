import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { ProductCard } from "@/components/site/product-card";
import { Section, SectionHeading } from "@/components/site/section";
import { DomainIcon } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import { solutions } from "@/config/solutions";
import { JsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl, toFaDigits } from "@/lib/utils";
import { getSolutionDetail } from "@/modules/solutions/queries";

export const revalidate = 3600;

/** همه راهکارها در زمان build تولید می‌شوند — تعدادشان کم و ثابت است */
export function generateStaticParams() {
  return solutions.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getSolutionDetail(slug);
  if (!detail) return pageMetadata({ title: "راهکار پیدا نشد", path: `/solutions/${slug}`, noIndex: true });

  return pageMetadata({
    title: detail.solution.name,
    description: `${detail.solution.question} ${detail.solution.summary}`,
    path: `/solutions/${detail.solution.slug}`,
  });
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getSolutionDetail(slug);
  if (!detail) notFound();

  const { solution, categories, products } = detail;
  const others = solutions.filter((s) => s.slug !== solution.slug).slice(0, 4);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: solution.name,
          headline: solution.question,
          description: solution.summary,
          url: absoluteUrl(`/solutions/${solution.slug}`, siteConfig.url),
          inLanguage: "fa-IR",
          isPartOf: { "@id": `${siteConfig.url}/#website` },
          about: categories.map((category) => ({
            "@type": "Thing",
            name: category.name,
            url: absoluteUrl(`/products?category=${category.slug}`, siteConfig.url),
          })),
        }}
      />

      <PageHeader
        title={solution.name}
        crumbs={[
          { name: "راهکارها", href: "/solutions" },
          { name: solution.name, href: `/solutions/${solution.slug}` },
        ]}
      >
        {/* پرسش کاربر بزرگ‌تر از عنوان صفحه است — همان چیزی که او دنبالش می‌گردد */}
        <p className="mt-5 flex items-start gap-4">
          <span
            className="mt-1 grid size-12 shrink-0 place-items-center rounded-lg border border-[var(--border-brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
            aria-hidden
          >
            <DomainIcon name={solution.icon} className="size-6" />
          </span>
          <span className="font-display text-[1.25rem] font-bold leading-[1.6] tracking-tight text-[var(--fg-primary)] sm:text-[1.5rem]">
            {solution.question}
          </span>
        </p>
      </PageHeader>

      {/* وضعیت شما ← راهکار ما */}
      <Section>
        <div className="shell">
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            <Reveal className="lg:col-span-5">
              <div className="h-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-7 sm:p-8">
                <p className="eyebrow mb-4">وضعیت شما</p>
                <p className="text-[0.9375rem] leading-9 text-[var(--fg-secondary)]">
                  {solution.situation}
                </p>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-7" delay={90}>
              <div className="edge-lit relative h-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-7 sm:p-8">
                <p className="eyebrow mb-4">راهکار نیروژن</p>
                <p className="text-[0.9375rem] leading-9 text-[var(--fg-primary)]">
                  {solution.resolution}
                </p>

                <div className="mt-7 border-t border-[var(--border-hairline)] pt-6">
                  <p className="mb-4 font-mono text-micro tracking-[0.2em] text-[var(--fg-subtle)]">
                    آنچه انتخاب تجهیز را تعیین می‌کند
                  </p>
                  <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {solution.considerations.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-meta leading-7 text-[var(--fg-secondary)]"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          className="mt-1.5 size-3 shrink-0 text-[var(--brand)]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* دسته‌بندی‌های مرتبط — پل بین راهکار و کاتالوگ */}
      {categories.length > 0 && (
        <Section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
          <div className="shell">
            <SectionHeading
              eyebrow="از کجا شروع کنم"
              title="دسته‌بندی‌های مرتبط با این راهکار"
              description="هر کدام از این دسته‌ها بخشی از تجهیزات موردنیاز این کاربری را پوشش می‌دهند."
            />

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category, index) => (
                <li key={category.id}>
                  <Reveal delay={index * 60}>
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="group flex h-full items-center gap-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4 transition-all duration-400 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--brand)] transition-all duration-300 group-hover:border-[var(--border-brand)] group-hover:bg-[var(--brand-soft)]">
                        <DomainIcon name={category.icon} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold transition-colors group-hover:text-[var(--brand)]">
                          {category.name}
                        </span>
                        <span className="mt-1 block font-mono text-micro text-[var(--fg-subtle)]">
                          {toFaDigits(category.productCount)} کالا
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
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* محصولات مرتبط — یا حالت خالی صادقانه */}
      <Section className="border-t border-[var(--border-hairline)]">
        <div className="shell">
          <SectionHeading
            eyebrow="تجهیزات"
            title="محصولات مرتبط"
            description={
              products.length > 0
                ? "نمونه‌ای از کالاهایی که در این کاربری بیشتر استفاده می‌شوند."
                : undefined
            }
            action={
              products.length > 0 && categories[0]
                ? { label: "مشاهده همه", href: `/products?category=${categories[0].slug}` }
                : undefined
            }
          />

          {products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product, index) => (
                <Reveal key={product.id} delay={index * 60}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <div className="brackets rounded-xl border border-dashed border-[var(--border-default)] px-6 py-16 text-center">
                <h3 className="font-display text-lg font-bold">
                  هنوز کالایی برای این راهکار ثبت نشده است
                </h3>
                <p className="mx-auto mt-4 max-w-lg text-sm leading-8 text-[var(--fg-muted)]">
                  کاتالوگ این بخش در حال تکمیل است. اگر تجهیز موردنیاز شما اینجا نیست، مشخصات
                  پروژه را بفرستید؛ کارشناسان ما گزینه مناسب را پیدا و تأمین می‌کنند.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/quote"
                    className="inline-flex h-12 items-center rounded-md bg-[var(--brand)] px-7 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
                  >
                    ثبت درخواست تأمین
                  </Link>
                  <Link
                    href="/products"
                    className="inline-flex h-12 items-center rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
                  >
                    مرور کل کاتالوگ
                  </Link>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </Section>

      {/* فراخوان مشاوره */}
      <Section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
        <div className="shell">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-8 sm:p-10 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <h2 className="font-display text-[1.375rem] font-bold leading-[1.6] tracking-tight sm:text-[1.625rem]">
                  برای انتخاب دقیق تجهیزات این کاربری مشاوره می‌خواهید؟
                </h2>
                <p className="mt-4 text-[0.9375rem] leading-8 text-[var(--fg-muted)]">
                  مشخصات پروژه را بفرستید تا هد و دبی موردنیاز محاسبه و گزینه مناسب به شما پیشنهاد
                  شود.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/quote"
                  className="inline-flex h-12 items-center rounded-md bg-[var(--brand)] px-7 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
                >
                  استعلام قیمت
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
                >
                  تماس با کارشناسان
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* سایر راهکارها */}
      {others.length > 0 && (
        <Section className="border-t border-[var(--border-hairline)]">
          <div className="shell">
            <SectionHeading eyebrow="ادامه مسیر" title="سایر راهکارها" action={{ label: "همه راهکارها", href: "/solutions" }} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((other, index) => (
                <li key={other.slug}>
                  <Reveal delay={index * 60}>
                    <Link
                      href={`/solutions/${other.slug}`}
                      className="group flex h-full flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-5 transition-all duration-400 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]"
                    >
                      <span className="mb-3 grid size-10 place-items-center rounded-md border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--brand)] transition-all duration-300 group-hover:border-[var(--border-brand)] group-hover:bg-[var(--brand-soft)]">
                        <DomainIcon name={other.icon} className="size-5" />
                      </span>
                      <span className="text-sm font-semibold transition-colors group-hover:text-[var(--brand)]">
                        {other.name}
                      </span>
                      <span className="clamp-2 mt-2 text-[0.75rem] leading-6 text-[var(--fg-muted)]">
                        {other.summary}
                      </span>
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </>
  );
}
