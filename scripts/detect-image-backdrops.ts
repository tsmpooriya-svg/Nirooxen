/**
 * =============================================================================
 *  تشخیص پس‌زمینهٔ تصویرهای موجود
 * =============================================================================
 *  قاب نقشه‌کشی فقط وقتی با عکس ترکیب می‌شود که پس‌زمینه‌اش روشن باشد. تصویرهای
 *  تازه این را در لحظهٔ آپلود می‌گیرند؛ این اسکریپت همان کار را برای تصویرهایی
 *  می‌کند که از قبل در پایگاه داده‌اند.
 *
 *  فایل خوانده و تحلیل می‌شود، نه تغییر داده. تنها چیزی که نوشته می‌شود یک
 *  ستون متنی است، و هر اجرای دوباره فقط ردیف‌های بررسی‌نشده را برمی‌دارد.
 *
 *  اجرا:
 *      npm run db:backdrops:dry     پیش‌نمایش، بدون نوشتن
 *      npm run db:backdrops         اعمال
 *      ... --all                    بررسی دوبارهٔ همه، حتی ردیف‌های بررسی‌شده
 * =============================================================================
 */
import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

import { detectBackdrop } from "../src/lib/media/backdrop";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALL = argv.includes("--all");

/**
 * نشانی تصویر را به مسیر فایل روی دیسک ترجمه می‌کند.
 *
 * دو منبع وجود دارد: دارایی‌های آپلودشده که زیر MEDIA_STORAGE_ROOT می‌نشینند، و
 * فایل‌های ثابتِ داخل public که از نسخه‌های قدیمی‌تر مانده‌اند. هر چیز دیگری —
 * مثلاً نشانی بیرونی — رد می‌شود؛ دانلود کردن کار این اسکریپت نیست.
 */
function fileFor(url: string, storageKey: string | null): string | null {
  if (url.startsWith("/media/")) {
    const root = process.env.MEDIA_STORAGE_ROOT?.trim();
    if (!root) return null;
    return path.join(root, url.slice("/media/".length));
  }
  if (url.startsWith("/")) return path.join(process.cwd(), "public", url);
  // storageKey بدون نشانیِ قابل ترجمه: کلید پیشوند است، نه فایل
  if (storageKey) return null;
  return null;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  /*
    تصویری که پس‌زمینه‌اش هنگام آپلود برداشته شده دوباره سنجیده نمی‌شود: فایلش
    شفاف است و detectBackdrop روی شفافیتِ سفیدشده جواب «روشن» می‌دهد، که پرچم
    درست را خراب می‌کرد.
  */
  const { rows } = await client.query<{
    id: string;
    url: string;
    storage_key: string | null;
    backdrop: string | null;
  }>(
    `select id, url, storage_key, backdrop
       from product_images
      where url not like '%.svg'
        and coalesce(backdrop, '') <> 'cut'
        ${ALL ? "" : "and backdrop is null"}
      order by url`,
  );

  console.log(`\n${APPLY ? "── تشخیص پس‌زمینه ──" : "── پیش‌نمایش (چیزی نوشته نشد) ──"}\n`);
  console.log(`  ${rows.length} تصویر برای بررسی\n`);

  const tally = { cut: 0, light: 0, dark: 0, missing: 0 };

  for (const row of rows) {
    const file = fileFor(row.url, row.storage_key);
    if (!file) {
      tally.missing += 1;
      continue;
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(file);
    } catch {
      tally.missing += 1;
      continue;
    }

    const backdrop = await detectBackdrop(buffer);
    tally[backdrop] += 1;

    if (APPLY) {
      await client.query("update product_images set backdrop = $1 where id = $2", [backdrop, row.id]);
    }
  }

  const line = (k: string, v: number) => console.log(`  ${k.padEnd(28, "·")} ${v}`);
  if (tally.cut > 0) line("پس‌زمینه برداشته‌شده", tally.cut);
  line("پس‌زمینهٔ روشن (ترکیب می‌شود)", tally.light);
  line("پس‌زمینهٔ تیره (بدون ترکیب)", tally.dark);
  line("فایلش پیدا نشد", tally.missing);

  if (!APPLY) {
    console.log(`\n  برای اجرای واقعی، همین دستور را با --apply تکرار کنید.\n`);
  } else {
    console.log(`\n  ✓ ثبت شد. برای دیده شدن روی سایت، build و restart لازم است.\n`);
  }

  await client.end();
}

main().catch((error) => {
  console.error("\n✖ خطا:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
