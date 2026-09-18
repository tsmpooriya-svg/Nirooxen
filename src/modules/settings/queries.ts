/**
 * =============================================================================
 *  تنظیمات سایت — لایه خواندن
 * =============================================================================
 *  تا پیش از این، جدول `settings` فقط نوشته می‌شد: پنل مدیریت مقدارها را
 *  ذخیره می‌کرد اما هیچ‌جای سایت عمومی آن‌ها را نمی‌خواند. یعنی مدیر نام
 *  شرکت یا شماره تماس را عوض می‌کرد و هیچ اتفاقی نمی‌افتاد.
 *
 *  الگوی این ماژول:
 *
 *      پایگاه داده  →  منبع حقیقت
 *      config/site  →  مقدار پیش‌فرض (fallback)
 *
 *  نتیجه: روی نصب تازه و بدون هیچ ردیفی در جدول، سایت درست کار می‌کند؛ و به
 *  محض اینکه مدیر مقداری را ذخیره کند، همان مقدار جای پیش‌فرض را می‌گیرد —
 *  بدون تغییر کد.
 *
 *  افزودن کلید تازه:
 *    ۱. کلید را در `SETTING_KEYS` اضافه کنید.
 *    ۲. پیش‌فرضش را در `resolveSiteSettings` از siteConfig بخوانید.
 *  پنل مدیریت خودبه‌خود آن را نشان می‌دهد چون فرم تنظیمات روی ردیف‌های جدول
 *  حلقه می‌زند، نه روی فهرست ثابتی در کد.
 * =============================================================================
 */
import "server-only";

import { cache } from "react";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { siteConfig } from "@/config/site";

/** کلیدهایی که سایت عمومی واقعاً مصرف می‌کند */
export const SETTING_KEYS = {
  siteName: "site.name",
  siteTagline: "site.tagline",
  contactPhone: "contact.phone",
  contactPhoneAlt: "contact.phoneAlt",
  contactMobile: "contact.mobile",
  contactEmail: "contact.email",
  contactSalesEmail: "contact.salesEmail",
  contactAddress: "contact.address",
  contactPostalCode: "contact.postalCode",
  contactWorkingHours: "contact.workingHours",
  contactMapUrl: "contact.mapUrl",
  contactGeoLat: "contact.geoLat",
  contactGeoLng: "contact.geoLng",
  seoMetaTitle: "seo.metaTitle",
  seoMetaDescription: "seo.metaDescription",
  featureCart: "features.cart",
} as const;

export type SiteSettings = {
  name: string;
  tagline: string;
  description: string;
  contact: {
    /** نمایشی — ممکن است ارقام فارسی داشته باشد */
    phones: readonly string[];
    /** قابل شماره‌گیری — فقط ارقام لاتین */
    phonesRaw: readonly string[];
    mobile: string;
    mobileRaw: string;
    email: string;
    salesEmail: string;
    address: string;
    postalCode: string;
    workingHours: string;
    mapUrl: string;
    geo: { lat: number; lng: number };
  };
  seo: { metaTitle: string; metaDescription: string };
  features: { cart: boolean };
};

/** فقط رشته غیرخالی جایگزین پیش‌فرض می‌شود */
function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/** عدد معتبر جایگزین پیش‌فرض می‌شود؛ رشته هم پذیرفته می‌شود چون فرم تنظیمات متن ذخیره می‌کند */
function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** حذف هر چیزی جز رقم — برای ساخت نسخه قابل شماره‌گیری از شماره نمایشی */
function dialable(display: string, fallback: string): string {
  const digits = display
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  return digits || fallback;
}

/** ترکیب ردیف‌های پایگاه داده با پیش‌فرض‌های config */
export function resolveSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const get = (key: string) => map.get(key);

  const phoneDisplay = str(get(SETTING_KEYS.contactPhone), siteConfig.contact.phones[0]);
  const mobileDisplay = str(get(SETTING_KEYS.contactMobile), siteConfig.contact.mobile);

  // شماره دوم اختیاری است و فقط از تنظیمات می‌آید (config پیش‌فرضی برایش
  // ندارد). خالی که باشد از فهرست حذف می‌شود، یعنی شرکتی که یک خط تلفن دارد
  // شماره جانشین نمایش نمی‌دهد.
  const phoneAltDisplay = str(get(SETTING_KEYS.contactPhoneAlt), "");
  const phonesDisplay = [phoneDisplay, ...(phoneAltDisplay ? [phoneAltDisplay] : [])];
  const phonesRaw = phonesDisplay.map((p) => dialable(p, siteConfig.contact.phonesRaw[0]));

  return {
    name: str(get(SETTING_KEYS.siteName), siteConfig.name),
    tagline: str(get(SETTING_KEYS.siteTagline), siteConfig.tagline),
    description: str(get(SETTING_KEYS.seoMetaDescription), siteConfig.description),
    contact: {
      phones: phonesDisplay,
      phonesRaw,
      mobile: mobileDisplay,
      mobileRaw: dialable(mobileDisplay, siteConfig.contact.mobileRaw),
      email: str(get(SETTING_KEYS.contactEmail), siteConfig.contact.email),
      salesEmail: str(get(SETTING_KEYS.contactSalesEmail), siteConfig.contact.salesEmail),
      address: str(get(SETTING_KEYS.contactAddress), siteConfig.contact.address),
      postalCode: str(get(SETTING_KEYS.contactPostalCode), siteConfig.contact.postalCode),
      workingHours: str(get(SETTING_KEYS.contactWorkingHours), siteConfig.contact.workingHours),
      mapUrl: str(get(SETTING_KEYS.contactMapUrl), siteConfig.contact.mapUrl),
      geo: {
        lat: num(get(SETTING_KEYS.contactGeoLat), siteConfig.contact.geo.lat),
        lng: num(get(SETTING_KEYS.contactGeoLng), siteConfig.contact.geo.lng),
      },
    },
    seo: {
      metaTitle: str(
        get(SETTING_KEYS.seoMetaTitle),
        `${siteConfig.name} | ${siteConfig.tagline}`,
      ),
      metaDescription: str(get(SETTING_KEYS.seoMetaDescription), siteConfig.description),
    },
    features: {
      // پیش‌فرض true است چون سبد استعلام روی سایت فعال و در حال کار است
      cart: bool(get(SETTING_KEYS.featureCart), true),
    },
  };
}

/**
 * تنظیمات سایت.
 *
 * با `cache()` در طول یک رندر فقط یک‌بار کوئری می‌خورد. اگر پایگاه داده در
 * دسترس نباشد (مثلاً هنگام build روی محیطی بدون DB) به‌جای خطا، پیش‌فرض‌های
 * config برمی‌گردد تا صفحه‌ها همچنان تولید شوند.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await db.select({ key: settings.key, value: settings.value }).from(settings);
    return resolveSiteSettings(rows);
  } catch (error) {
    // نبودِ پایگاه داده نباید کل سایت را از کار بیندازد؛ تنظیمات به پیش‌فرض
    // ثابتِ config برمی‌گردد. اما خطا باید در لاگ بماند وگرنه قطعی دیده نمی‌شود.
    console.error("[settings] خواندن تنظیمات سایت ناموفق بود؛ مقدار پیش‌فرض استفاده شد:", error);
    return resolveSiteSettings([]);
  }
});
