/**
 * محدودسازی نرخ درخواست — پیاده‌سازی in-memory با پنجره لغزان.
 *
 * برای یک نصب تک‌سروری (که حالت رایج این پروژه است) کافی است.
 *
 * ⚠️ وضعیت در حافظهٔ همین پروسه نگهداری می‌شود. با چند instance (چند process
 * در PM2، چند کانتینر، یا استقرار افقی) هر instance شمارندهٔ خودش را دارد و
 * سقف مؤثر در عمل در تعداد instance ها ضرب می‌شود. استقرار چند-instance به
 * وضعیت مشترک (مثلاً Redis) نیاز دارد؛ تنها همین فایل باید عوض شود، امضای
 * تابع تغییری نمی‌کند.
 */
import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/*
  کلید هر سطل از IP ساخته می‌شود، یعنی مهاجم آن را کنترل می‌کند. جاروی زمانی
  فقط هر ۶۰ ثانیه اجرا می‌شود و سطل‌ها تا پایان پنجره (برای خبرنامه یک ساعت)
  زنده‌اند؛ پس بدون سقف، سیلی از IP های جعلی می‌توانست حافظهٔ پروسه را پر کند.
  سقف زیر آن حالت را به یک هزینهٔ ثابت تبدیل می‌کند.
*/
const MAX_BUCKETS = 20_000;
/** پس از پر شدن، تا این اندازه کوچک می‌شود تا حذف در هر درخواست تکرار نشود */
const TARGET_BUCKETS = 16_000;

function dropExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function sweep(now: number) {
  if (now - lastSweep >= 60_000) {
    lastSweep = now;
    dropExpired(now);
  }

  if (buckets.size <= MAX_BUCKETS) return;

  // زیر فشار، اول منقضی‌ها؛ اگر باز هم زیاد بود قدیمی‌ترین‌ها (ترتیب درج Map)
  dropExpired(now);
  for (const key of buckets.keys()) {
    if (buckets.size <= TARGET_BUCKETS) break;
    buckets.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** پیش‌تنظیم‌های رایج */
export const RATE_LIMITS = {
  /** ثبت سفارش/استعلام: ۵ بار در ۱۰ دقیقه از هر IP */
  order: { limit: 5, windowMs: 10 * 60_000 },
  /** فرم تماس: ۳ بار در ۱۰ دقیقه */
  contact: { limit: 3, windowMs: 10 * 60_000 },
  /** ورود به پنل: ۸ تلاش در ۱۵ دقیقه */
  login: { limit: 8, windowMs: 15 * 60_000 },
  /** خبرنامه */
  subscribe: { limit: 3, windowMs: 60 * 60_000 },
  /** جستجوی سریع: سخاوتمند برای تایپِ debounce شده، ولی جلوی برداشت انبوه کاتالوگ را می‌گیرد */
  search: { limit: 30, windowMs: 60_000 },
  /**
   * ثبت بازدید: یک بار به ازای هر صفحه‌ای که باز می‌شود، پس بازدیدکنندهٔ فعال
   * هم به این نزدیک نمی‌شود. سقف برای این است که یک اسکریپت نتواند گزارش را
   * با چند هزار ردیف جعلی بی‌معنا کند.
   */
  view: { limit: 60, windowMs: 60_000 },
} as const;

/** فقط برای بررسی و تست — اندازهٔ فعلی جدول سطل‌ها */
export function rateLimitBucketCount(): number {
  return buckets.size;
}
