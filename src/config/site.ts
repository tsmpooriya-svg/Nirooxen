/**
 * =============================================================================
 *  پیکربندی مرکزی سایت
 * =============================================================================
 *  ⚠️ برای شخصی‌سازی، فقط همین فایل را ویرایش کنید.
 *  نام شرکت، اطلاعات تماس، شبکه‌های اجتماعی و ساختار منو همگی از اینجا خوانده
 *  می‌شوند و در هیچ کامپوننتی hard-code نشده‌اند.
 *
 *  مقادیر قابل تغییر از پنل مدیریت (بخش تنظیمات) این فایل را override می‌کنند؛
 *  این‌ها مقادیر پیش‌فرض/fallback هستند.
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

  /** سال تأسیس — در بخش «درباره ما» و شمارنده‌های سایت استفاده می‌شود */
  foundedYear: 1385,

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

  /** آمار نمایشی صفحه اصلی — از پنل مدیریت قابل ویرایش است */
  stats: [
    { value: 18, suffix: "+", label: "سال سابقه اجرایی" },
    { value: 2400, suffix: "+", label: "پروژه تحویل‌شده" },
    { value: 96, suffix: "%", label: "رضایت کارفرمایان" },
    { value: 31, suffix: "", label: "استان تحت پوشش" },
  ],
} as const;

/** منوی اصلی سایت */
export const mainNav = [
  { title: "صفحه اصلی", href: "/" },
  { title: "محصولات", href: "/products", hasMegaMenu: true },
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
