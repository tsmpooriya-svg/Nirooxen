import { CartPanel } from "@/components/site/cart-panel";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SiteSettingsProvider } from "@/components/site/settings-provider";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getCategoryTree } from "@/modules/catalog/queries";
import { getSiteSettings } from "@/modules/settings/queries";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // هدر و فوتر کامپوننت کلاینت‌اند، پس تنظیمات به‌صورت prop پایین می‌رود
  const [categories, settings] = await Promise.all([getCategoryTree(), getSiteSettings()]);

  return (
    <>
      <JsonLd data={[organizationJsonLd(settings), websiteJsonLd(settings)]} />

      {/* پرش به محتوا — الزام دسترس‌پذیری برای کاربران کیبورد */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-[var(--brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--fg-on-brand)]"
      >
        رفتن به محتوای اصلی
      </a>

      <SiteSettingsProvider settings={settings}>
        <SiteHeader categories={categories} settings={settings} />
        <main id="main">{children}</main>
        <SiteFooter settings={settings} />
        {settings.features.cart && <CartPanel />}
      </SiteSettingsProvider>
    </>
  );
}
