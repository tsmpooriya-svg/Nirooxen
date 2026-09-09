import "server-only";

import { getStorage } from "@/lib/storage";
import { isSafeKey } from "@/lib/storage/keys";

/** پسوندهای ممکن نسخهٔ مادر — برای پاک‌سازی، بدون نیاز به ذخیرهٔ پسوند در پایگاه داده */
const ORIGINAL_EXTENSIONS = ["jpg", "png", "webp"] as const;

/**
 * حذف همهٔ فایل‌های یک دارایی از روی پیشوند آن.
 *
 * «بهترین تلاش» است: اگر پاک کردن فایلی شکست بخورد، ذخیرهٔ محصول نباید برگردد —
 * نتیجه‌اش فقط یک فایل بی‌ارجاع روی دیسک است، نه داده‌ی خراب.
 */
export async function deleteAssetByPrefix(prefix: string): Promise<void> {
  const storage = getStorage();
  const keys = [`${prefix}/detail.webp`, ...ORIGINAL_EXTENSIONS.map((e) => `${prefix}/original.${e}`)];
  for (const key of keys) {
    if (!isSafeKey(key)) continue;
    await storage.delete(key).catch(() => {});
  }
}
