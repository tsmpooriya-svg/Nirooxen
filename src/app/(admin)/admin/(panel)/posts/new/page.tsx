import { PostForm } from "@/components/admin/post-form";
import { AdminPageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
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
