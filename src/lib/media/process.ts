import "server-only";

import sharp, { type Metadata } from "sharp";

/**
 * اعتبارسنجی و بهینه‌سازی تصویر آپلودشده.
 *
 * ترتیب کار عمداً «اول اعتبارسنجی، بعد پردازش، بعد نوشتن» است: تا وقتی هر سه
 * مرحله موفق نشده‌اند هیچ فایلی در مسیر نهایی و هیچ رکوردی در پایگاه داده ساخته
 * نمی‌شود.
 */

/** SVG عمداً پذیرفته نمی‌شود: می‌تواند اسکریپت داشته باشد و CSP فعلی هم آن را مسدود می‌کند. */
const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedMime = keyof typeof ALLOWED;

/** عرض دارایی تحویلی. next/image بر اساس sizes از همین منبع، نسخه‌های کوچک‌تر می‌سازد. */
const DISPLAY_WIDTH = 1600;
const DISPLAY_QUALITY = 82;

const DEFAULT_MAX_MB = 8;

export function maxUploadBytes(): number {
  const raw = Number(process.env.MEDIA_MAX_UPLOAD_MB);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_MB;
  return Math.round(mb * 1024 * 1024);
}

export function maxUploadMb(): number {
  return Math.round(maxUploadBytes() / (1024 * 1024));
}

/**
 * تشخیص نوع از روی بایت‌های ابتدایی فایل، نه از روی هدر Content-Type که کلاینت
 * می‌فرستد و قابل جعل است.
 */
export function sniffMime(buffer: Buffer): AllowedMime | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return "image/png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export function extensionFor(mime: AllowedMime): string {
  return ALLOWED[mime];
}

export type ProcessedImage = {
  mime: AllowedMime;
  originalExtension: string;
  /** بایت‌های اصلی، دست‌نخورده — نسخهٔ مادر برای ساخت دوبارهٔ نسخه‌ها در آینده */
  original: Buffer;
  /** نسخهٔ تحویلی webp */
  display: Buffer;
  /** ابعاد همان نسخهٔ تحویلی — نه تصویر اصلی؛ این‌ها فایلی را توصیف می‌کنند که url به آن اشاره دارد */
  width: number;
  height: number;
};

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export async function processUpload(buffer: Buffer): Promise<ProcessedImage> {
  if (buffer.length === 0) throw new MediaValidationError("فایل خالی است.");
  if (buffer.length > maxUploadBytes()) {
    throw new MediaValidationError(`حجم فایل بیش از ${maxUploadMb()} مگابایت است.`);
  }

  const mime = sniffMime(buffer);
  if (!mime) {
    throw new MediaValidationError("فقط تصویر JPEG، PNG یا WebP پذیرفته می‌شود.");
  }

  // متادیتا هم نوع را تأیید می‌کند و هم فایل‌های خراب را رد می‌کند
  let meta: Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new MediaValidationError("فایل تصویر معتبر نیست یا خراب است.");
  }

  const format = meta.format;
  if (format !== "jpeg" && format !== "png" && format !== "webp") {
    throw new MediaValidationError("فقط تصویر JPEG، PNG یا WebP پذیرفته می‌شود.");
  }
  if (!meta.width || !meta.height) {
    throw new MediaValidationError("ابعاد تصویر قابل تشخیص نیست.");
  }

  let display: Buffer;
  let displayWidth: number;
  let displayHeight: number;
  try {
    // resolveWithObject ابعاد خروجی را بدون رمزگشایی دوباره برمی‌گرداند
    const rendered = await sharp(buffer)
      .rotate() // اعمال جهت EXIF پیش از حذف متادیتا
      .resize({ width: DISPLAY_WIDTH, withoutEnlargement: true })
      .webp({ quality: DISPLAY_QUALITY })
      .toBuffer({ resolveWithObject: true });
    display = rendered.data;
    displayWidth = rendered.info.width;
    displayHeight = rendered.info.height;
  } catch {
    throw new MediaValidationError("پردازش تصویر ناموفق بود.");
  }

  return {
    mime,
    originalExtension: extensionFor(mime),
    original: buffer,
    display,
    width: displayWidth,
    height: displayHeight,
  };
}
