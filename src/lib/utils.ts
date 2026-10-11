import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { siteConfig } from "@/config/site";

/** ادغام امن کلاس‌های Tailwind */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------- */
/*  اعداد و ارقام فارسی                                                        */
/* -------------------------------------------------------------------------- */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** تبدیل ارقام لاتین به فارسی */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** تبدیل ارقام فارسی/عربی به لاتین — برای ورودی فرم‌ها ضروری است */
export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** جداکننده هزارگان با ارقام فارسی */
export function formatNumber(value: number | null | undefined, fa = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const formatted = new Intl.NumberFormat("en-US").format(value);
  return fa ? toFaDigits(formatted) : formatted;
}

/** قیمت به تومان — «۱۲٬۴۰۰٬۰۰۰ تومان» */
export function formatPrice(
  value: number | null | undefined,
  opts: { currency?: string; fa?: boolean; withUnit?: boolean } = {},
): string {
  const { currency = "IRT", fa = true, withUnit = true } = opts;
  if (value === null || value === undefined) return "—";
  const label = currency === "IRT" ? "تومان" : currency;
  return `${formatNumber(value, fa)}${withUnit ? ` ${label}` : ""}`;
}

/** خلاصه‌سازی عدد برای داشبورد: ۱۲٫۴ میلیون */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${toFaDigits((value / 1_000_000_000).toFixed(1))} میلیارد`;
  if (value >= 1_000_000) return `${toFaDigits((value / 1_000_000).toFixed(1))} میلیون`;
  if (value >= 1_000) return `${toFaDigits((value / 1_000).toFixed(1))} هزار`;
  return formatNumber(value);
}

/* -------------------------------------------------------------------------- */
/*  تاریخ شمسی                                                                  */
/* -------------------------------------------------------------------------- */

const jalaliDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const jalaliDateShort = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const jalaliDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return jalaliDate.format(new Date(value));
}

export function formatDateShort(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return jalaliDateShort.format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return jalaliDateTime.format(new Date(value));
}

/** «۳ ساعت پیش» — برای خط زمانی سفارش‌ها و لاگ‌ها */
export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${toFaDigits(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toFaDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${toFaDigits(days)} روز پیش`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${toFaDigits(months)} ماه پیش`;
  return `${toFaDigits(Math.floor(months / 12))} سال پیش`;
}

/** سال شمسی جاری */
export function currentJalaliYear(): number {
  return Number(
    toEnDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date())),
  );
}

/* -------------------------------------------------------------------------- */
/*  متن                                                                         */
/* -------------------------------------------------------------------------- */

/** ساخت slug سازگار با فارسی (حروف فارسی حفظ می‌شوند) */
export function slugify(input: string): string {
  return input
    .trim()
    .replace(/[‌‏‎]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

export function truncate(text: string, length = 120): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

/** حذف تگ‌های HTML — برای تولید excerpt و متادیتا */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** تخمین زمان مطالعه بر اساس سرعت متوسط خواندن فارسی */
export function readingTime(text: string): number {
  const words = stripHtml(text).split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** حروف اول نام برای آواتار */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}

/* -------------------------------------------------------------------------- */
/*  اعتبارسنجی سبک                                                              */
/* -------------------------------------------------------------------------- */

/** نرمال‌سازی شماره موبایل ایران به فرمت 09XXXXXXXXX */
export function normalizePhone(input: string): string {
  const digits = toEnDigits(input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+98")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0098")) return `0${digits.slice(4)}`;
  if (digits.startsWith("98") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}

export function isValidIranianPhone(input: string): boolean {
  const phone = normalizePhone(input);
  return /^09\d{9}$/.test(phone) || /^0\d{2,3}\d{8}$/.test(phone);
}

/* -------------------------------------------------------------------------- */
/*  کمکی‌های عمومی                                                              */
/* -------------------------------------------------------------------------- */

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** ساخت آرایه بازه‌ای برای صفحه‌بندی */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** ساخت query string بدون کلیدهای خالی */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * نشانی مطلق می‌سازد و نامک فارسی را برای مصرف ماشینی درصدی می‌کند.
 *
 * encodeURI تنها نویسه‌های خارج از ASCII را رمز می‌کند و «/ ? # & =» را دست
 * نمی‌زند، پس مسیرهای دارای query یا لنگر سالم می‌مانند. «%» هم رمز نمی‌شود،
 * بنابراین نشانیِ از پیش رمزشده دوباره رمز نمی‌شود.
 */
export function absoluteUrl(path: string, base?: string): string {
  const origin = base ?? siteConfig.url;
  return encodeURI(`${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`);
}

/**
 * نامک را از حالت درصدی (percent-encoding) بیرون می‌آورد.
 *
 * در صفحه‌های App Router مقدار پویا همان‌طور که در نشانی آمده تحویل داده
 * می‌شود؛ برای نامک فارسی یعنی «%D8%A7…» نه «ا». اگر همین رشته را به پرس‌وجو
 * بدهیم هیچ ردیفی پیدا نمی‌شود و صفحه ۴۰۴ می‌گیرد. (در Route Handler برعکس
 * است و مقدار از قبل رمزگشایی شده می‌رسد؛ رمزگشایی دوباره‌اش بی‌خطر است.)
 *
 * اگر رشته «%» تنها یا دنبالهٔ ناقص داشته باشد decodeURIComponent استثنا
 * می‌اندازد؛ در آن حالت همان ورودی برمی‌گردد تا صفحه به‌جای خطای ۵۰۰،
 * مسیر عادیِ «پیدا نشد» را برود.
 */
export function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
