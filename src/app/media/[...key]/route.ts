import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";

import { getLocalStorage } from "@/lib/storage";
import { isSafeKey } from "@/lib/storage/keys";

/**
 * تحویل فایل‌های مدیا — مسیر جایگزین برای توسعه و تست.
 *
 * در production انتظار می‌رود nginx مسیر /media/ را مستقیم از دیسک سرو کند و
 * درخواست هرگز به Node نرسد؛ این هندلر فقط تضمین می‌کند که بدون nginx هم توسعه
 * و تست ممکن باشد. هیچ ورودی کاربر به مسیر فایل تبدیل نمی‌شود مگر از فیلتر
 * isSafeKey و بررسی محدودهٔ ریشهٔ provider عبور کند.
 *
 * ⚠️ این مسیر فقط نسخه‌های تحویلیِ عمومی را سرو می‌کند. هر پیکربندی nginx/CDN
 * که کل پوشهٔ مدیا را alias کند، همین سیاست را دور می‌زند و نسخهٔ مادر را
 * عمومی می‌کند؛ بخش «ذخیره‌سازی تصاویر» در README.
 */

/*
  فهرست سفید نسخه‌های عمومی — بر پایهٔ نام فایل، نه پسوند.

  پیش از این هر فایلی با پسوند تصویری سرو می‌شد، پس `original.png` کنار
  `detail.webp` قابل دریافت بود: نشانی نسخهٔ تحویلی در HTML عمومی هست و پسوند
  نسخهٔ مادر فقط سه حالت دارد، یعنی با دو درخواست ناموفق پیدا می‌شد. نسخهٔ مادر
  بایت‌به‌بایت همان فایل آپلودی است و متادیتای EXIF (از جمله GPS) را نگه
  می‌دارد، در حالی که نسخهٔ تحویلی آن را دور می‌ریزد.

  پس سیاست برعکس شد: فقط نام‌هایی که صریحاً اینجا هستند عمومی‌اند. نسخهٔ مادر
  برای بازسازی نسخه‌ها در سمت سرور نگه داشته می‌شود و هیچ‌جای برنامه آن را از
  راه عمومی نمی‌خواند.

  نگاشت نام → Content-Type همان محافظت پسوندِ قبلی است، فقط محدودتر: نوع پاسخ
  هنوز از فهرست ثابت می‌آید و هرگز از ورودی کاربر حدس زده نمی‌شود.
*/
const PUBLIC_VARIANTS: Record<string, string> = {
  "detail.webp": "image/webp",
  /* نسخهٔ کارت هنوز تولید نمی‌شود؛ وقتی اضافه شد، این مسیر بدون تغییر می‌پذیردش */
  "card.webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key: segments } = await params;
  const key = segments.join("/");

  if (!isSafeKey(key)) return new Response("Not found", { status: 404 });

  /*
    بررسی پیش از هر دسترسی دیسکی: درخواست نسخهٔ مادر حتی به فایل‌سیستم هم
    نمی‌رسد. پاسخ دقیقاً همان ۴۰۴ فایل ناموجود است، پس از بیرون نمی‌توان فهمید
    نسخهٔ مادر وجود دارد یا نه.
  */
  const filename = key.slice(key.lastIndexOf("/") + 1).toLowerCase();
  const contentType = PUBLIC_VARIANTS[filename];
  if (!contentType) return new Response("Not found", { status: 404 });

  // بیرون از try: خطای پیکربندی (نبودن MEDIA_STORAGE_ROOT) باید بالا برود و ۵۰۰
  // شود، نه اینکه به شکل ۴۰۴ پنهان بماند
  const storage = getLocalStorage();

  let filePath: string;
  try {
    // کلید نامعتبر، خروج از ریشه (از جمله از راه symlink) و فایل ناموجود، همگی ۴۰۴
    filePath = await storage.resolveForRead(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    size = info.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as WebReadableStream<Uint8Array>;
  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      // کلید هر دارایی یکتا و تغییرناپذیر است، پس کش بلندمدت امن است
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
