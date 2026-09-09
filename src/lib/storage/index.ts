import "server-only";

import os from "node:os";
import path from "node:path";

import { LocalStorageProvider } from "./local";
import type { StorageProvider } from "./types";

/**
 * ریشهٔ ذخیره‌سازی مدیا.
 *
 * در production تعریف آن الزامی است: اگر پیش‌فرضی می‌گذاشتیم، یک استقرار
 * فراموش‌شده تصاویر را در مسیری موقت می‌نوشت و اولین ری‌استارت پاکشان می‌کرد.
 * در توسعه به یک مسیر موقتِ بیرون از مخزن برمی‌گردد تا هیچ‌وقت داخل درخت سورس
 * نوشته نشود.
 */
function resolveRoot(): string {
  const configured = process.env.MEDIA_STORAGE_ROOT?.trim();
  if (configured) return path.resolve(configured);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "متغیر MEDIA_STORAGE_ROOT در production الزامی است؛ مسیری پایدار و خارج از پوشهٔ برنامه تعریف کنید.",
    );
  }
  return path.join(os.tmpdir(), "nirooxen-media");
}

/** پیشوند عمومی؛ در production همین مسیر را nginx مستقیم از دیسک سرو می‌کند. */
export const MEDIA_PUBLIC_PREFIX = "/media";

let cached: LocalStorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!cached) cached = new LocalStorageProvider(resolveRoot(), MEDIA_PUBLIC_PREFIX);
  return cached;
}

/** فقط مسیر تحویل fallback از این استفاده می‌کند. */
export function getLocalStorage(): LocalStorageProvider {
  getStorage();
  return cached!;
}

export { StorageError } from "./types";
export type { StorageProvider } from "./types";
