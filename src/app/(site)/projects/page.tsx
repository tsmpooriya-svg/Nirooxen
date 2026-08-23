import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { pageMetadata } from "@/lib/seo";
import { getProjects } from "@/modules/content/queries";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "پروژه‌های اجراشده",
  description:
    "نمونه‌ای از پروژه‌های آبرسانی، ایستگاه پمپاژ، تصفیه آب و تأسیسات مکانیکی که تأمین و اجرا کرده‌ایم.",
  path: "/projects",
});

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <PageHeader
        title="پروژه‌های اجراشده"
        description="کارنامه ما در محل اجرا نوشته شده است. این نمونه‌ها تصویری از دامنه کاری و مقیاس پروژه‌هایی می‌دهد که با آن‌ها کار می‌کنیم."
        crumbs={[{ name: "پروژه‌ها", href: "/projects" }]}
      />

      <div className="shell py-12">
        {projects.length === 0 ? (
          <div className="brackets mx-auto max-w-xl rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-8 py-16 text-center">
            <p className="eyebrow mb-4">به‌زودی</p>
            <h2 className="font-display text-xl font-bold">
              نمونه‌کارها در حال آماده‌سازی است
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-8 text-[var(--fg-muted)]">
              در حال جمع‌آوری مستندات و تصاویر پروژه‌های اجراشده هستیم. تا آن زمان، برای دریافت
              سوابق اجرایی مرتبط با پروژه خودتان می‌توانید مستقیم با کارشناسان ما تماس بگیرید.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex h-12 items-center rounded-md bg-[var(--brand)] px-7 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
            >
              تماس با کارشناسان
            </Link>
          </div>
        ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project, index) => (
            <Reveal key={project.id} delay={index * 70}>
              <article className="group h-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-lg)]">
                <div className="relative aspect-16/9 overflow-hidden bg-[var(--bg-inset)]">
                  {project.coverUrl && (
                    <Image
                      src={project.coverUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elev-1)] to-transparent" aria-hidden />
                  <div className="absolute inset-x-5 bottom-4 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--border-brand)] bg-[var(--bg-glass-strong)] px-2.5 py-1 text-[0.625rem] text-[var(--brand)] backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6">
                  <h2 className="font-display text-lg font-bold leading-8 transition-colors group-hover:text-[var(--brand)]">
                    {project.title}
                  </h2>
                  {project.summary && (
                    <p className="mt-3 text-[0.8125rem] leading-7 text-[var(--fg-muted)]">{project.summary}</p>
                  )}

                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border-hairline)] pt-4 text-xs sm:grid-cols-4">
                    {project.client && <Meta label="کارفرما" value={project.client} />}
                    {project.location && <Meta label="موقعیت" value={project.location} />}
                    {project.year && <Meta label="سال" value={project.year} />}
                    {project.capacity && <Meta label="ظرفیت" value={project.capacity} />}
                  </dl>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        )}
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] text-[var(--fg-subtle)]">{label}</dt>
      <dd className="mt-1 truncate font-medium text-[var(--fg-secondary)]">{value}</dd>
    </div>
  );
}
