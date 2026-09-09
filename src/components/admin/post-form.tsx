"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useReadOnly } from "./shell";
import { useToast } from "@/components/ui/toast";
import { POST_STATUS } from "@/lib/constants";
import { savePost, type ActionState } from "@/modules/admin/actions";

export type PostFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  tags: string;
  status: string;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
};

const initialState: ActionState = { status: "idle" };

const CATEGORIES = ["اخبار شرکت", "مقالات فنی", "راهنمای خرید", "معرفی محصول"];

export function PostForm({ values }: { values: PostFormValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const action = savePost.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const readOnly = useReadOnly();

  React.useEffect(() => {
    if (state.status === "idle") return;
    toast({
      title: state.status === "success" ? "ذخیره شد" : "خطا",
      description: state.message,
      tone: state.status === "success" ? "success" : "error",
    });
    if (state.status === "success" && !values.id && state.id) router.push(`/admin/posts/${state.id}`);
  }, [state, toast, router, values.id]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="space-y-5">
          <Field label="عنوان" htmlFor="title" required error={state.errors?.title}>
            <Input id="title" name="title" defaultValue={values.title} required />
          </Field>

          <Field label="خلاصه" htmlFor="excerpt" hint="در کارت مطلب و نتایج جستجو نمایش داده می‌شود.">
            <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={values.excerpt} />
          </Field>

          <Field
            label="متن مطلب"
            htmlFor="content"
            required
            error={state.errors?.content}
            hint="### برای تیتر · > برای نقل‌قول · - برای فهرست · **متن** برای پررنگ"
          >
            <Textarea id="content" name="content" rows={20} defaultValue={values.content} required className="font-mono text-meta leading-8" />
          </Field>
        </div>

        <aside className="space-y-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4">
          <Field label="وضعیت" htmlFor="status">
            <Select id="status" name="status" defaultValue={values.status}>
              {Object.entries(POST_STATUS).map(([key, entry]) => (
                <option key={key} value={key}>{entry.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="دسته" htmlFor="category">
            <Input id="category" name="category" list="post-categories" defaultValue={values.category} />
            <datalist id="post-categories">
              {CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <Field label="نامک (slug)" htmlFor="slug" hint="خالی = ساخت خودکار">
            <Input id="slug" name="slug" defaultValue={values.slug} dir="ltr" className="text-start font-mono text-xs" />
          </Field>

          <Field label="تصویر شاخص" htmlFor="coverUrl">
            <Input id="coverUrl" name="coverUrl" defaultValue={values.coverUrl} dir="ltr" className="text-start font-mono text-xs" placeholder="/images/products/…" />
          </Field>

          <Field label="برچسب‌ها" htmlFor="tags" hint="با ویرگول جدا کنید.">
            <Input id="tags" name="tags" defaultValue={values.tags} />
          </Field>

          <Checkbox name="isFeatured" defaultChecked={values.isFeatured} label="مطلب شاخص" />

          <div className="space-y-4 border-t border-[var(--border-hairline)] pt-4">
            <Field label="عنوان متا" htmlFor="metaTitle">
              <Input id="metaTitle" name="metaTitle" defaultValue={values.metaTitle} />
            </Field>
            <Field label="توضیحات متا" htmlFor="metaDescription">
              <Textarea id="metaDescription" name="metaDescription" rows={3} defaultValue={values.metaDescription} />
            </Field>
          </div>
          {!readOnly && (
  
            <button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-md bg-[var(--brand)] text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-60"
            >
              {pending ? "در حال ذخیره…" : "ذخیره مطلب"}
            </button>
          )}
        </aside>
      </div>
    </form>
  );
}
