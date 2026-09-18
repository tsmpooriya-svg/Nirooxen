import type { Metadata, Viewport } from "next";

import { ThemeProvider, themeScript } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { buildBaseMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/modules/settings/queries";

import "./globals.css";

/**
 * متادیتا از تنظیمات پایگاه داده ساخته می‌شود تا مدیر بتواند نام سایت و
 * عنوان/توضیحات پیش‌فرض SEO را بدون تغییر کد عوض کند.
 * `saveSettings` با revalidatePath("/", "layout") صفحه‌ها را تازه می‌کند.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildBaseMetadata(await getSiteSettings());
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // کاربر باید بتواند زوم کند — محدود کردن آن نقض دسترس‌پذیری است
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050910" },
    { media: "(prefers-color-scheme: light)", color: "#f2f6fa" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="light" suppressHydrationWarning>
      <head>
        {/* پیش از اولین رنگ‌آمیزی اجرا می‌شود تا تم بدون پرش اعمال شود */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
