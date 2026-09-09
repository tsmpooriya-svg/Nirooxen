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
 * isSafeKey و بررسی محدودهٔ ریشه در provider عبور کند.
 */
const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key: segments } = await params;
  const key = segments.join("/");

  if (!isSafeKey(key)) return new Response("Not found", { status: 404 });

  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
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
