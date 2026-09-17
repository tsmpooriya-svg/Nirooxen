import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { pageViews, settings } from "@/db/schema";

/**
 * =============================================================================
 *  ثبت بازدید صفحه
 * =============================================================================
 *  قاعده مثل ثبت جست‌وجو: **هرگز خطا پرتاب نمی‌کند.** آمار نباید هیچ صفحه‌ای را
 *  خراب کند؛ اگر درج شکست بخورد فقط در لاگ سرور می‌ماند.
 * =============================================================================
 */

/** مسیرهایی که اصلاً شمرده نمی‌شوند */
const IGNORED = [/^\/admin/, /^\/api/, /^\/media/, /^\/_next/];

/**
 * ربات‌های شناخته‌شده.
 *
 * چون ثبت از سمت مرورگر انجام می‌شود، خزندهٔ بدون جاوااسکریپت اصلاً به اینجا
 * نمی‌رسد. این فهرست برای آن‌هایی است که جاوااسکریپت اجرا می‌کنند و اگر شمرده
 * شوند، «پربازدیدترین محصول» را به چیزی تبدیل می‌کنند که هیچ آدمی ندیده.
 */
const BOT = /bot|crawler|spider|crawling|headless|lighthouse|preview|monitor|curl|wget|python-requests/i;

/** طول درهم — ۱۶ نویسهٔ hex برای شمارش روزانه بیش از کافی است */
const HASH_LEN = 16;

/**
 * نوع صفحه از روی مسیر.
 *
 * یک بار همین‌جا تعیین می‌شود تا گزارش مجبور نباشد رشته تجزیه کند. ترتیب مهم
 * است: بلندترین پیشوند اول.
 */
export function pathKind(path: string): string {
  if (path === "/") return "home";
  if (path.startsWith("/products/")) return "product";
  if (path.startsWith("/products")) return "catalog";
  if (path.startsWith("/brands/")) return "brand";
  if (path.startsWith("/news/")) return "news";
  if (path.startsWith("/solutions/")) return "solution";
  if (path.startsWith("/quote")) return "quote";
  if (path.startsWith("/contact")) return "contact";
  return "page";
}

/** کلید نمکِ امروز در جدول تنظیمات */
const saltKey = (day: string) => `analytics:salt:${day}`;

/** تاریخ به وقت تهران — «امروز» باید همان روزی باشد که مدیر سایت می‌بیند */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
}

/**
 * نمکِ امروز را می‌گیرد و اگر نبود می‌سازد.
 *
 * درج با `on conflict do nothing` انجام می‌شود و بعد دوباره خوانده می‌شود: اگر
 * دو درخواست هم‌زمان اولین بازدید روز باشند، هر دو باید به یک نمک برسند، وگرنه
 * همان بازدیدکننده دو بار شمرده می‌شود.
 *
 * نمک روز قبل عمداً پاک نمی‌شود — چند ردیف کوچک است و نگه‌داشتنش یعنی گزارشِ
 * روزهای گذشته هم قابل بازتولید می‌ماند. چیزی که پاک می‌شود هم قابل بازگرداندن
 * نیست، پس پاک‌کردنش هیچ چیزی را امن‌تر نمی‌کند.
 */
async function dailySalt(day: string): Promise<string> {
  const key = saltKey(day);

  const existing = await db
    .select({ value: settings.value })
    .from(settings)
    .where(sql`${settings.key} = ${key}`)
    .limit(1);
  if (existing[0]) return String(existing[0].value);

  const fresh = randomBytes(32).toString("hex");
  await db
    .insert(settings)
    .values({ key, value: fresh, group: "analytics", label: `نمک آمار ${day}` })
    .onConflictDoNothing();

  const settled = await db
    .select({ value: settings.value })
    .from(settings)
    .where(sql`${settings.key} = ${key}`)
    .limit(1);
  return settled[0] ? String(settled[0].value) : fresh;
}

/** فقط دامنه — نشانی کامل می‌تواند عبارت جست‌وجو یا شناسهٔ کارزار را با خود بیاورد */
export function referrerHost(referrer: string | null, selfHost: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    // ورود از صفحهٔ دیگری از همین سایت ارجاع بیرونی نیست
    if (!host || (selfHost && host === selfHost.replace(/^www\./, "").toLowerCase())) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

export async function recordView(input: {
  path: string;
  referrer: string | null;
  ip: string | null;
  userAgent: string | null;
  selfHost: string | null;
}): Promise<void> {
  const path = input.path.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/") || path.length > 200) return;
  if (IGNORED.some((re) => re.test(path))) return;
  if (input.userAgent && BOT.test(input.userAgent)) return;

  try {
    const day = today();
    const salt = await dailySalt(day);
    /*
      IP و مرورگر فقط از همین‌جا رد می‌شوند و هیچ‌وقت نوشته نمی‌شوند. نمک در
      ابتدای ورودی می‌آید تا درهم بدون دانستن آن قابل بازسازی نباشد.
    */
    const visitor = createHash("sha256")
      .update(`${salt}|${input.ip ?? "?"}|${input.userAgent ?? "?"}`)
      .digest("hex")
      .slice(0, HASH_LEN);

    await db.insert(pageViews).values({
      path,
      kind: pathKind(path),
      referrerHost: referrerHost(input.referrer, input.selfHost),
      visitor,
    });
  } catch (error) {
    console.error("[page-views] ثبت بازدید انجام نشد:", error);
  }
}
