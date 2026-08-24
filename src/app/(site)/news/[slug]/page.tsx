import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { Breadcrumb } from "@/components/site/breadcrumb";
import { JsonLd, articleJsonLd, pageMetadata } from "@/lib/seo";
import { formatDate, toFaDigits } from "@/lib/utils";
import {
  getAllPostSlugs,
  getPostBySlug,
  getRelatedPosts,
  incrementPostView,
} from "@/modules/content/queries";

type Params = Promise<{ slug: string }>;

export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPostBySlug(slug);
  if (!data) return pageMetadata({ title: "مطلب یافت نشد", path: `/news/${slug}`, noIndex: true });

  const { post } = data;
  return pageMetadata({
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    path: `/news/${post.slug}`,
    image: post.coverUrl,
    type: "article",
    publishedTime: post.publishedAt?.toISOString(),
  });
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getPostBySlug(slug);
  if (!data) notFound();

  const { post, authorName } = data;
  const related = await getRelatedPosts(post.id, post.category);

  after(() => incrementPostView(post.id));

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          coverUrl: post.coverUrl,
          publishedAt: post.publishedAt,
          authorName,
        })}
      />

      <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
        <div className="shell">
          <Breadcrumb
            items={[
              { name: "اخبار و مقالات", href: "/news" },
              { name: post.category, href: `/news?category=${encodeURIComponent(post.category)}` },
              { name: post.title, href: `/news/${post.slug}` },
            ]}
          />
        </div>
      </div>

      <article className="shell py-10">
        <header className="mx-auto max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2.5 text-xs text-[var(--fg-subtle)]">
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 font-medium text-[var(--brand)]">
              {post.category}
            </span>
            <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden>·</span>
            <span>{toFaDigits(post.readingMinutes)} دقیقه مطالعه</span>
            {authorName && (
              <>
                <span aria-hidden>·</span>
                <span>{authorName}</span>
              </>
            )}
          </div>

          <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.35] tracking-tight sm:text-[2.25rem]">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 border-s-2 border-[var(--brand)] ps-5 text-[0.9375rem] leading-9 text-[var(--fg-muted)]">
              {post.excerpt}
            </p>
          )}
        </header>

        {post.coverUrl && (
          <div className="relative mx-auto mt-9 aspect-16/9 max-w-4xl overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-inset)]">
            <Image
              src={post.coverUrl}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60rem"
              className="object-cover"
            />
          </div>
        )}

        <div className="mx-auto mt-10 max-w-3xl">
          <PostBody content={post.content} />

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--border-hairline)] pt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border-hairline)] px-3 py-1.5 text-xs text-[var(--fg-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)] py-14">
          <div className="shell mx-auto max-w-4xl">
            <h2 className="mb-6 font-display text-lg font-bold">مطالب مرتبط</h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/news/${item.slug}`}
                    className="group block h-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 transition-all duration-400 hover:-translate-y-1 hover:border-[var(--border-brand)]"
                  >
                    <p className="mb-2 font-mono text-micro text-[var(--fg-subtle)]">
                      {formatDate(item.publishedAt)}
                    </p>
                    <h3 className="clamp-3 text-[0.875rem] font-semibold leading-7 transition-colors group-hover:text-[var(--brand)]">
                      {item.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * رندر متن مطلب.
 *
 * عمداً از یک کتابخانه markdown استفاده نشده: محتوا از پنل مدیریت می‌آید و
 * تزریق HTML خام ریسک XSS دارد. این رندرر فقط زیرمجموعه‌ای امن و کنترل‌شده
 * (تیتر، نقل‌قول، فهرست، پاراگراف) را پشتیبانی می‌کند.
 */
function PostBody({ content }: { content: string }) {
  const blocks = content.split("\n\n");

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const trimmed = block.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h2 key={index} className="!mt-10 font-display text-xl font-bold">
              {trimmed.replace("### ", "")}
            </h2>
          );
        }

        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={index}
              className="border-s-2 border-[var(--brand)] bg-[var(--brand-soft)] px-6 py-5 text-[0.9375rem] leading-9 text-[var(--fg-secondary)]"
            >
              {trimmed.replace(/^> /gm, "")}
            </blockquote>
          );
        }

        if (/^[-*] /m.test(trimmed)) {
          const items = trimmed.split("\n").filter((line) => /^[-*] /.test(line.trim()));
          return (
            <ul key={index} className="space-y-2.5 ps-1">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[0.9375rem] leading-9 text-[var(--fg-secondary)]">
                  <span className="mt-3.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden />
                  <span>{renderInline(item.replace(/^[-*] /, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (/^\d+\. /m.test(trimmed)) {
          const items = trimmed.split("\n").filter((line) => /^\d+\. /.test(line.trim()));
          return (
            <ol key={index} className="space-y-2.5">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[0.9375rem] leading-9 text-[var(--fg-secondary)]">
                  <span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] font-mono text-micro text-[var(--brand)]">
                    {toFaDigits(i + 1)}
                  </span>
                  <span>{renderInline(item.replace(/^\d+\. /, ""))}</span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index} className="text-[0.9375rem] leading-9 text-[var(--fg-secondary)]">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/** پررنگ‌سازی **متن** — تنها قالب‌بندی درون‌خطی پشتیبانی‌شده */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-[var(--fg-primary)]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}
