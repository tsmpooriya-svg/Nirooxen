import Link from "next/link";

import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { POST_STATUS } from "@/lib/constants";
import { buildQuery, formatDate, formatRelative, toFaDigits } from "@/lib/utils";
import { listAdminPosts } from "@/modules/admin/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const dynamic = "force-dynamic";
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminPostsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q);
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);
  const { items, total, pageCount } = await listAdminPosts({ q, page });

  return (
    <>
      <AdminPageHeader
        title="اخبار و مقالات"
        description={`${toFaDigits(total)} مطلب ثبت شده است.`}
        actions={
          <Link
            href="/admin/posts/new"
            className="flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] hover:bg-[var(--brand-hover)]"
          >
            مطلب جدید
          </Link>
        }
      />

      <form action="/admin/posts" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="جستجوی عنوان…"
          className="h-10 min-w-56 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3.5 text-sm outline-none focus:border-[var(--brand)]"
        />
        <button type="submit" className="h-10 rounded-md bg-[var(--brand)] px-5 text-sm font-medium text-[var(--fg-on-brand)] hover:bg-[var(--brand-hover)]">
          جستجو
        </button>
      </form>

      <Panel padded={false}>
        <DataTable head={["عنوان", "دسته", "وضعیت", "نویسنده", "بازدید", "انتشار", ""]} empty={items.length === 0}>
          {items.map((post) => (
            <Tr key={post.id}>
              <Td>
                <Link href={`/admin/posts/${post.id}`} className="block max-w-[22rem] truncate font-medium transition-colors hover:text-[var(--brand)]">
                  {post.title}
                </Link>
                <span className="mt-0.5 block font-mono text-[0.625rem] text-[var(--fg-subtle)]" dir="ltr">{post.slug}</span>
              </Td>
              <Td className="text-xs">{post.category}</Td>
              <Td>
                <StatusBadge map={POST_STATUS} value={post.status} />
                {post.isFeatured && <span className="mt-1 block text-[0.625rem] text-[var(--signal)]">شاخص</span>}
              </Td>
              <Td className="text-xs">{post.authorName ?? "—"}</Td>
              <Td className="font-mono text-xs">{toFaDigits(post.viewCount)}</Td>
              <Td className="whitespace-nowrap text-[0.6875rem] text-[var(--fg-subtle)]">
                {post.publishedAt ? formatDate(post.publishedAt) : "منتشر نشده"}
                <span className="mt-0.5 block">{formatRelative(post.updatedAt)}</span>
              </Td>
              <Td className="w-16">
                <Link
                  href={`/news/${post.slug}`}
                  target="_blank"
                  aria-label="مشاهده در سایت"
                  className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M6 3h7v7M13 3 6.5 9.5M11 10.5V13H3V5h2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>

      <Pagination page={page} pageCount={pageCount} buildHref={(n) => `/admin/posts${buildQuery({ q, page: n === 1 ? undefined : n })}`} />
    </>
  );
}
