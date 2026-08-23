import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { Pagination } from "@/components/ui/pagination";
import { pageMetadata } from "@/lib/seo";
import { buildQuery, formatDate, toFaDigits, truncate } from "@/lib/utils";
import { getPostCategories, getPublishedPosts } from "@/modules/content/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const revalidate = 1800;

export const metadata: Metadata = pageMetadata({
  title: "اخبار و مقالات فنی",
  description:
    "راهنمای انتخاب تجهیزات، نکات نگهداری، مقالات فنی صنعت آب و اخبار شرکت.",
  path: "/news",
});

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page ?? 1) || 1);

  const [{ items, pageCount }, categories] = await Promise.all([
    getPublishedPosts({ page, category }),
    getPostCategories(),
  ]);

  return (
    <>
      <PageHeader
        title="اخبار و مقالات فنی"
        description="آنچه در سال‌ها اجرا یاد گرفته‌ایم — بدون اغراق تبلیغاتی، با جزئیات قابل استفاده."
        crumbs={[{ name: "اخبار و مقالات", href: "/news" }]}
      />

      <div className="shell py-12">
        {/* فیلتر دسته */}
        <div className="mb-8 flex flex-wrap gap-2">
          <CategoryChip href="/news" active={!category} label="همه مطالب" />
          {categories.map((item) => (
            <CategoryChip
              key={item.category}
              href={`/news?category=${encodeURIComponent(item.category)}`}
              active={category === item.category}
              label={`${item.category} (${toFaDigits(item.total)})`}
            />
          ))}
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-default)] p-12 text-center text-sm text-[var(--fg-muted)]">
            هنوز مطلبی در این دسته منتشر نشده است.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((post, index) => (
              <Reveal key={post.id} delay={Math.min(index, 6) * 70}>
                <Link
                  href={`/news/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]"
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
                    <div className="mb-3 flex flex-wrap items-center gap-2.5 text-[0.6875rem] text-[var(--fg-subtle)]">
                      <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 font-medium text-[var(--brand)]">
                        {post.category}
                      </span>
                      <span>{formatDate(post.publishedAt)}</span>
                      <span aria-hidden>·</span>
                      <span>{toFaDigits(post.readingMinutes)} دقیقه مطالعه</span>
                    </div>

                    <h2 className="mb-2.5 clamp-2 font-display text-base font-bold leading-8 transition-colors group-hover:text-[var(--brand)]">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="clamp-3 text-[0.8125rem] leading-7 text-[var(--fg-muted)]">
                        {truncate(post.excerpt, 150)}
                      </p>
                    )}

                    <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium text-[var(--brand)] transition-all duration-300 group-hover:gap-3">
                      ادامه مطلب
                      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        <Pagination
          page={page}
          pageCount={pageCount}
          buildHref={(n) => `/news${buildQuery({ category, page: n === 1 ? undefined : n })}`}
        />
      </div>
    </>
  );
}

function CategoryChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 " +
        (active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
          : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]")
      }
    >
      {label}
    </Link>
  );
}
