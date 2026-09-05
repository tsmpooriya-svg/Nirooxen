/**
 * محدودسازی نرخ درخواست — پیاده‌سازی in-memory با پنجره لغزان.
 *
 * برای یک نصب تک‌سروری (که حالت رایج این پروژه است) کافی است.
 * اگر روزی چند instance اجرا شد، تنها همین فایل باید به Redis مهاجرت کند؛
 * امضای تابع تغییری نمی‌کند.
 */
import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
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
} as const;
