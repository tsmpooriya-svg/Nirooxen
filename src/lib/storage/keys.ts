import "server-only";

import { randomUUID } from "node:crypto";

/**
 * کلیدها همیشه سمت سرور ساخته می‌شوند. نام فایلِ ارسالی کلاینت هرگز وارد کلید
 * نمی‌شود — فقط به‌عنوان متادیتا نگهداری می‌شود — تا نه traversal ممکن باشد و
 * نه نام فایل قابل حدس زدن.
 */
const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]*\.[a-z0-9]+$/;

export type ProductAssetVariant = "card" | "detail" | "original";

export function newAssetId(): string {
  return randomUUID();
}

export function productAssetKey(
  productId: string,
  assetId: string,
  variant: ProductAssetVariant,
  extension: string,
): string {
  return `products/${productId}/${assetId}/${variant}.${extension}`;
}

/** پیشوند مشترک همهٔ نسخه‌های یک دارایی — مقداری که در پایگاه داده ذخیره می‌شود */
export function productAssetPrefix(productId: string, assetId: string): string {
  return `products/${productId}/${assetId}`;
}

const PRODUCT_PREFIX = /^products\/([0-9a-f-]{36})\/[0-9a-f-]{36}$/i;

/**
 * آیا این پیشوند دارایی، متعلق به همین محصول است؟
 *
 * کلید از سمت کلاینت باز می‌گردد و هنگام ذخیره‌ی محصول مبنای حذف فایل است؛ بدون
 * این بررسی، فرستادن کلید محصول دیگر باعث حذف دارایی آن محصول می‌شد.
 */
export function isOwnProductAssetPrefix(prefix: string, productId: string | undefined): boolean {
  if (!productId) return false;
  const match = PRODUCT_PREFIX.exec(prefix);
  return match !== null && match[1]!.toLowerCase() === productId.toLowerCase();
}

/**
 * اعتبارسنجی کلید پیش از رسیدن به فایل‌سیستم. جدا از بررسی مسیرِ provider است
 * تا ورودی نامعتبر پیش از هر عملیات دیسکی رد شود.
 */
export function isSafeKey(key: string): boolean {
  if (!key || key.length > 300) return false;
  if (key.includes("..") || key.includes("//") || key.startsWith("/")) return false;
  if (key.includes("\0") || key.includes("\\")) return false;
  return KEY_PATTERN.test(key);
}
