import "server-only";

import { getStorage } from "@/lib/storage";
import { isSafeKey } from "@/lib/storage/keys";

/** پسوندهای ممکن نسخهٔ مادر — برای پاک‌سازی، بدون نیاز به ذخیرهٔ پسوند در پایگاه داده */
const ORIGINAL_EXTENSIONS = ["jpg", "png", "webp"] as const;

/**
 * حذف همهٔ فایل‌های یک دارایی از روی پیشوند آن.
 *
 * «بهترین تلاش» است: اگر پاک کردن فایلی شکست بخورد، عملیات پایگاه داده نباید
 * برگردد — نتیجه‌اش فقط یک فایل بی‌ارجاع روی دیسک است، نه دادهٔ خراب. اما
 * شکست بی‌صدا هم نمی‌ماند: بدون لاگ، انباشت فایل‌های یتیم دیده نمی‌شود.
 *
 * فایل ناموجود خطا نیست؛ provider با force حذف می‌کند، پس تلاش برای هر سه
 * پسوند نسخهٔ مادر لاگ اضافه تولید نمی‌کند.
 *
 * @returns تعداد کلیدهایی که حذفشان شکست خورد (صفر یعنی پاک‌سازی کامل)
 */
export async function deleteAssetByPrefix(prefix: string): Promise<number> {
  const keys = [`${prefix}/detail.webp`, ...ORIGINAL_EXTENSIONS.map((e) => `${prefix}/original.${e}`)];
  let failed = 0;

  for (const key of keys) {
    if (!isSafeKey(key)) continue;
    try {
      /*
        getStorage() هم داخل try است: ساختن provider می‌تواند خطا بدهد (نبودِ
        MEDIA_STORAGE_ROOT در production). اگر آن خطا بیرون بزند، فراخوان — که
        تراکنش پایگاه داده‌اش همین حالا کامیت شده — عملیات موفق را ناموفق
        گزارش می‌کند و لاگ فعالیت هم نوشته نمی‌شود. اینجا مثل هر شکست دیگرِ
        پاک‌سازی شمرده می‌شود.
      */
      await getStorage().delete(key);
    } catch (error) {
      failed += 1;
      // فقط کلید نسبی لاگ می‌شود، نه مسیر فایل‌سیستمی
      console.error(`[media] حذف دارایی ناموفق بود (${key}):`, error);
    }
  }

  return failed;
}
