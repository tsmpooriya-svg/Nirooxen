import "server-only";

import { mkdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { isSafeKey } from "./keys";
import { StorageError, type StorageProvider } from "./types";

/**
 * ذخیره‌سازی روی فایل‌سیستم سرور.
 *
 * ریشه از پیکربندی می‌آید و باید بیرون از درخت سورس برنامه باشد، وگرنه هر بار
 * build/deploy فایل‌های کاربر را از بین می‌برد. مسیر مطلق هرگز در پایگاه داده
 * ذخیره نمی‌شود؛ فقط کلید نسبی.
 */
export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly root: string,
    private readonly publicPrefix: string,
  ) {}

  /**
   * تنها نقطه‌ای که کلید به مسیر واقعی تبدیل می‌شود. علاوه بر بررسی الگوی کلید،
   * مسیرِ resolve‌شده هم باید داخل ریشه بماند — دو لایه در برابر path traversal.
   */
  private resolve(key: string): string {
    if (!isSafeKey(key)) throw new StorageError("کلید ذخیره‌سازی نامعتبر است.");
    const full = path.resolve(this.root, key);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;
    if (!full.startsWith(rootWithSep)) throw new StorageError("کلید ذخیره‌سازی نامعتبر است.");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    // نوشتن روی فایل موقتِ هم‌پوشه و سپس rename: خواننده هرگز فایل نیمه‌کاره نمی‌بیند
    const tmp = `${full}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmp, data);
      await rename(tmp, full);
    } catch (error) {
      await rm(tmp, { force: true }).catch(() => {});
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const info = await stat(this.resolve(key));
      return info.isFile();
    } catch {
      return false;
    }
  }

  publicUrl(key: string): string {
    if (!isSafeKey(key)) throw new StorageError("کلید ذخیره‌سازی نامعتبر است.");
    return `${this.publicPrefix}/${key}`;
  }

  /**
   * مسیر واقعی فایلِ موجود، برای مسیر تحویل fallback. علاوه بر بررسی کلید، مسیر
   * پس از باز شدن پیوندهای نمادین هم باید داخل ریشه بماند؛ وگرنه یک symlink
   * داخل ریشه می‌توانست هر فایلی از سرور را قابل خواندن کند.
   *
   * اگر فایل وجود نداشته باشد خطای فایل‌سیستم می‌دهد و فراخوان آن را ۴۰۴ می‌کند.
   */
  async resolveForRead(key: string): Promise<string> {
    const real = await realpath(this.resolve(key));
    const rootReal = await realpath(this.root);
    const rootWithSep = rootReal.endsWith(path.sep) ? rootReal : rootReal + path.sep;
    if (!real.startsWith(rootWithSep)) throw new StorageError("کلید ذخیره‌سازی نامعتبر است.");
    return real;
  }
}
