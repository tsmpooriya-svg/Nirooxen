import { PostForm } from "@/components/admin/post-form";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { requirePageAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  await requirePageAccess("posts");

  return (
    <>
      <AdminPageHeader
        breadcrumb={[{ label: "پنل", href: "/admin" }, { label: "اخبار و مقالات", href: "/admin/posts" }]}
        title="مطلب جدید"
      />
      <Panel>
        <PostForm
          values={{
            title: "", slug: "", excerpt: "", content: "", coverUrl: "",
            category: "مقالات فنی", tags: "", status: "DRAFT", isFeatured: false,
            metaTitle: "", metaDescription: "",
          }}
        />
      </Panel>
    </>
  );
}
