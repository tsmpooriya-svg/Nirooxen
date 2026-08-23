import { notFound } from "next/navigation";

import { PostForm } from "@/components/admin/post-form";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { formatDateTime, toFaDigits } from "@/lib/utils";
import { getAdminPost } from "@/modules/admin/queries";

type Params = Promise<{ id: string }>;
export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Params }) {
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return (
    <>
      <AdminPageHeader
        breadcrumb={[{ label: "پنل", href: "/admin" }, { label: "اخبار و مقالات", href: "/admin/posts" }]}
        title={post.title}
        description={`${toFaDigits(post.viewCount)} بازدید · آخرین ویرایش ${formatDateTime(post.updatedAt)}`}
      />
      <Panel>
        <PostForm
          values={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt ?? "",
            content: post.content,
            coverUrl: post.coverUrl ?? "",
            category: post.category,
            tags: post.tags.join("، "),
            status: post.status,
            isFeatured: post.isFeatured,
            metaTitle: post.metaTitle ?? "",
            metaDescription: post.metaDescription ?? "",
          }}
        />
      </Panel>
    </>
  );
}
