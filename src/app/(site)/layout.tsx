import { CartPanel } from "@/components/site/cart-panel";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getCategoryTree } from "@/modules/catalog/queries";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoryTree();

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      {/* پرش به محتوا — الزام دسترس‌پذیری برای کاربران کیبورد */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-[var(--brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--fg-on-brand)]"
      >
        رفتن به محتوای اصلی
      </a>

      <SiteHeader categories={categories} />
      <main id="main">{children}</main>
      <SiteFooter />
      <CartPanel />
    </>
  );
}
