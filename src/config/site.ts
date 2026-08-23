/**
 * =============================================================================
 *  پیکربندی مرکزی سایت
 * =============================================================================
 *  ⚠️ برای شخصی‌سازی، فقط همین فایل را ویرایش کنید.
 *  نام شرکت، اطلاعات تماس، شبکه‌های اجتماعی و ساختار منو همگی از اینجا خوانده
 *  می‌شوند و در هیچ کامپوننتی hard-code نشده‌اند.
 *
 *  رابطه این فایل با پنل مدیریت:
 *  ---------------------------------------------------------------------------
 *  کلیدهای زیر از جدول `settings` خوانده می‌شوند و مقدار این فایل فقط
 *  **پیش‌فرض** است؛ یعنی مدیر می‌تواند بدون تغییر کد عوضشان کند:
 *
 *      site.name · site.tagline · contact.phone · contact.mobile
 *      contact.email · contact.address · seo.metaTitle
 *      seo.metaDescription · features.cart
 *
 *  بقیه مقادیر این فایل (منوها، شبکه‌های اجتماعی، ساعات کاری، نام لاتین،
 *  نام حقوقی) هنوز فقط از همین‌جا خوانده می‌شوند و در پنل مدیریت قابل
 *  ویرایش نیستند. منطق ترکیب در `src/modules/settings/queries.ts` است.
 *
 * -----------------------------------------------------------------------------
 *  🚨 پیش از انتشار (LAUNCH BLOCKER)
 * -----------------------------------------------------------------------------
 *  مقادیر زیر هنوز جانشین (placeholder) هستند و **داده واقعی نیستند**.
 *  انتشار سایت با این مقادیر یعنی ارائه اطلاعات نادرست به مشتری:
 *
 *    • contact.phones / phonesRaw   — شماره‌های نمونه
 *    • contact.mobile / mobileRaw   — شماره نمونه
 *    • contact.address / postalCode — نشانی نمونه
 *    • contact.geo                  — مختصات مرکز تهران، نه دفتر واقعی
 *    • contact.mapUrl               — لینک عمومی گوگل‌مپ
 *
 *  فهرست کامل کارهای باقی‌مانده در LAUNCH-CHECKLIST.md نگهداری می‌شود.
 * =============================================================================
 */

export const siteConfig = {
  /** نام کوتاه — در لوگو و عنوان صفحات */
  name: "نیروژن",
  /** نام کامل حقوقی — در فوتر و داده‌های ساختاریافته */
  legalName: "شرکت مهندسی نیروژن",
  /** نام لاتین — در لوگو و متادیتای انگلیسی */
  latinName: "Nirooxen",
  tagline: "تأمین، فروش و نصب تجهیزات صنعتی و آبرسانی",
  description:
    "تأمین‌کننده تخصصی پمپ آب، الکتروپمپ صنعتی، مخازن تحت فشار، اتصالات و شیرآلات صنعتی؛ همراه با مشاوره فنی، طراحی و نصب تخصصی در سراسر کشور.",

  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "fa_IR",
  direction: "rtl",

  /**
   * سال تأسیس (هجری شمسی).
   *
   * تا زمانی که سال واقعی مشخص نشده، مقدار آن `null` است و هر بخشی که به آن
   * وابسته است (نشان هیرو، توضیح صفحه «درباره ما»، داده ساختاریافته) به‌طور
   * خودکار حذف می‌شود. برای فعال‌سازی، کافی است عدد واقعی را جایگزین کنید.
   */
  foundedYear: null as number | null,

  contact: {
    phones: ["۰۲۱-۱۲۳۴۵۶۷۸", "۰۲۱-۸۷۶۵۴۳۲۱"],
    mobile: "۰۹۱۲-۱۲۳۴۵۶۷",
    /** نسخه قابل شماره‌گیری (فقط ارقام لاتین) */
    phonesRaw: ["02112345678", "02187654321"],
    mobileRaw: "09121234567",
    email: "info@nirooxen.com",
    salesEmail: "sales@nirooxen.com",
    address: "تهران، بزرگراه فتح، خیابان صنعت، پلاک ۱۲۸، طبقه سوم",
    postalCode: "۱۳۸۷۶۵۴۳۲۱",
    workingHours: "شنبه تا چهارشنبه ۸:۰۰ تا ۱۷:۰۰ — پنجشنبه ۸:۰۰ تا ۱۳:۰۰",
    mapUrl: "https://maps.google.com",
    /** مختصات دفتر برای نقشه و داده ساختاریافته */
    geo: { lat: 35.7219, lng: 51.3347 },
  },

  social: [
    { label: "اینستاگرام", href: "https://instagram.com", icon: "instagram" },
    { label: "تلگرام", href: "https://t.me", icon: "telegram" },
    { label: "واتس‌اپ", href: "https://wa.me/989121234567", icon: "whatsapp" },
    { label: "لینکدین", href: "https://linkedin.com", icon: "linkedin" },
  ],

  /**
   * آمار نمایشی صفحه اصلی و صفحه «درباره ما».
   *
   * ⚠️ عمداً خالی است. مقادیر قبلی (۱۸ سال سابقه، ۲۴۰۰ پروژه، ۹۶٪ رضایت،
   * ۳۱ استان) داده واقعی نبودند و ادعای تأییدنشده درباره کسب‌وکار محسوب
   * می‌شدند؛ بنابراین حذف شدند.
   *
   * تمام بخش‌هایی که این آرایه را مصرف می‌کنند وقتی خالی باشد چیزی نمایش
   * نمی‌دهند. برای فعال‌سازی دوباره، فقط اعداد واقعی و قابل استناد را اینجا
   * اضافه کنید — ساختار و طراحی دست‌نخورده باقی مانده است:
   *
   *   stats: [
   *     { value: 12, suffix: "+", label: "سال سابقه اجرایی" },
   *   ]
   */
  stats: [] as ReadonlyArray<{ value: number; suffix: string; label: string }>,
} as const;

/** منوی اصلی سایت */
export const mainNav = [
  { title: "صفحه اصلی", href: "/" },
  { title: "محصولات", href: "/products", hasMegaMenu: true },
  { title: "راهکارها", href: "/solutions" },
  { title: "برندها", href: "/brands" },
  { title: "خدمات", href: "/services" },
  { title: "پروژه‌ها", href: "/projects" },
  { title: "اخبار و مقالات", href: "/news" },
  { title: "درباره ما", href: "/about" },
  { title: "تماس با ما", href: "/contact" },
] as const;

/** ستون‌های فوتر */
export const footerNav = [
  {
    title: "دسترسی سریع",
    links: [
      { title: "محصولات", href: "/products" },
      { title: "راهکارها", href: "/solutions" },
      { title: "برندها", href: "/brands" },
      { title: "خدمات فنی", href: "/services" },
      { title: "پروژه‌های اجراشده", href: "/projects" },
      { title: "اخبار و مقالات", href: "/news" },
    ],
  },
  {
    title: "خدمات ما",
    links: [
      { title: "مشاوره و انتخاب تجهیزات", href: "/services#consulting" },
      { title: "طراحی سیستم آبرسانی", href: "/services#design" },
      { title: "نصب و راه‌اندازی", href: "/services#installation" },
      { title: "سرویس و نگهداری", href: "/services#maintenance" },
      { title: "تأمین قطعات یدکی", href: "/services#parts" },
    ],
  },
  {
    title: "راهنما",
    links: [
      { title: "درباره ما", href: "/about" },
      { title: "تماس با ما", href: "/contact" },
      { title: "استعلام قیمت", href: "/products" },
      { title: "پرسش‌های متداول", href: "/about#faq" },
      { title: "شرایط و قوانین", href: "/terms" },
    ],
  },
] as const;

export type SiteConfig = typeof siteConfig;
