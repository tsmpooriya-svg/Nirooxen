import "server-only";

/**
 * قرارداد ذخیره‌سازی فایل.
 *
 * لایه‌های محصول/پنل هرگز مستقیم با فایل‌سیستم کار نمی‌کنند؛ فقط همین قرارداد
 * را می‌بینند. امروز تنها پیاده‌سازی LocalStorageProvider است، اما جایگزینی آن
 * با یک provider سازگار با S3 نباید به تغییر منطق محصول نیاز داشته باشد.
 *
 * کلید (key) یک مسیر نسبی پایدار است، نه مسیر فایل‌سیستمی و نه URL؛ ترجمهٔ آن
 * به نشانی عمومی وظیفهٔ خود provider است.
 */
export type StorageProvider = {
  /** نوشتن اتمیک: ابتدا فایل موقت، سپس جابه‌جایی روی مقصد */
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** نشانی عمومی متناظر با کلید — برای local، مسیر same-origin است */
  publicUrl(key: string): string;
};

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}
