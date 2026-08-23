import { Reveal } from "@/components/motion/reveal";
import { Hero } from "@/components/site/home/hero";
import {
  AdvantagesSection,
  BrandsSection,
  CategoriesSection,
  CtaSection,
  NewsSection,
  ProcessSection,
  ProjectsSection,
  SolutionsSection,
} from "@/components/site/home/sections";
import { ProductCard } from "@/components/site/product-card";
import { Section, SectionHeading } from "@/components/site/section";
import { getBrands, getCategoryTree, getFeaturedProducts } from "@/modules/catalog/queries";
import { getProjects, getPublishedPosts } from "@/modules/content/queries";
import { getSiteSettings } from "@/modules/settings/queries";
import { listSolutionSummaries } from "@/modules/solutions/queries";

/** صفحه اصلی هر ساعت به‌صورت ایستا بازتولید می‌شود */
export const revalidate = 3600;

export default async function HomePage() {
  const [categories, featured, brands, projects, news, solutionSummaries, settings] = await Promise.all([
    getCategoryTree(),
    getFeaturedProducts(8),
    getBrands(),
    getProjects(3),
    getPublishedPosts({ pageSize: 3 }),
    listSolutionSummaries(),
    getSiteSettings(),
  ]);

  // در صفحه اصلی فقط راهکارهای شاخص نمایش داده می‌شوند
  const featuredSolutions = solutionSummaries.filter((s) => s.solution.isFeatured);

  return (
    <>
      <Hero categories={categories} settings={settings} />

      <CategoriesSection categories={categories} />

      {/*
        بلافاصله بعد از دسته‌بندی‌ها می‌نشیند تا دو مسیر ورود کنار هم دیده
        شوند: یکی بر اساس نام محصول، دیگری بر اساس مسئله کاربر.
      */}
      <SolutionsSection summaries={featuredSolutions} />

      {featured.length > 0 && (
        <Section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
          <div className="shell">
            <SectionHeading
              eyebrow="پرفروش‌ترین‌ها"
              title="محصولات منتخب کارشناسان"
              description="این‌ها تجهیزاتی هستند که بیشترین رضایت را در پروژه‌های واقعی داشته‌اند."
              action={{ label: "همه محصولات", href: "/products" }}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product, index) => (
                <Reveal key={product.id} delay={index * 60}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      <AdvantagesSection />
      <ProcessSection />
      <BrandsSection brands={brands} />
      <ProjectsSection projects={projects} />
      <NewsSection posts={news.items} />
      <CtaSection settings={settings} />
    </>
  );
}
