/**
 * =============================================================================
 *  بررسی پیش از استقرار
 * =============================================================================
 *  اجرا:  npm run preflight
 *
 *  فقط پیکربندی را می‌خواند و گزارش می‌دهد: به پایگاه داده وصل نمی‌شود، چیزی
 *  نمی‌نویسد، مهاجرت اجرا نمی‌کند و هیچ مقداری از متغیرها را چاپ نمی‌کند.
 *
 *  هدف این است که خطاهای پیکربندی پیش از `npm run build` دیده شوند؛ در غیر این
 *  صورت مثلاً یک NEXT_PUBLIC_SITE_URL بدون scheme تا انتهای build می‌رود و آنجا
 *  فقط با پیام مبهم «Invalid URL» شکست می‌خورد.
 * =============================================================================
 */
import "dotenv/config";

import path from "node:path";

const REQUIRED_NODE_MAJOR = 22;

const problems = [];
const notes = [];

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < REQUIRED_NODE_MAJOR) {
  problems.push(`Node ${REQUIRED_NODE_MAJOR} یا بالاتر لازم است — نسخه فعلی ${process.versions.node}`);
} else {
  notes.push(`Node ${process.versions.node}`);
}

if (!process.env.DATABASE_URL?.trim()) {
  problems.push("DATABASE_URL تعریف نشده است");
} else {
  notes.push("DATABASE_URL تعریف شده است");
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const isProduction = process.env.NODE_ENV === "production";

if (!siteUrl) {
  if (isProduction) problems.push("NEXT_PUBLIC_SITE_URL در production الزامی است");
  else notes.push("NEXT_PUBLIC_SITE_URL تعریف نشده — در توسعه به localhost برمی‌گردد");
} else {
  let parsed = null;
  try {
    parsed = new URL(siteUrl);
  } catch {
    problems.push(
      "NEXT_PUBLIC_SITE_URL نشانی مطلق نیست؛ باید با https:// شروع شود (مثال: https://example.com)",
    );
  }

  if (parsed) {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      problems.push(`NEXT_PUBLIC_SITE_URL باید http یا https باشد — دریافت شد: ${parsed.protocol}`);
    } else if (isProduction && parsed.hostname === "localhost") {
      problems.push("NEXT_PUBLIC_SITE_URL روی production به localhost اشاره می‌کند");
    } else {
      notes.push(`NEXT_PUBLIC_SITE_URL نشانی مطلق معتبر است (${parsed.origin})`);
    }
  }
}

/*
  MEDIA_STORAGE_ROOT در production الزامی است، اما خطایش «تنبل» است: برنامه بالا
  می‌آید، کاتالوگ را سرو می‌کند و تنها در نخستین درخواست تصویر یا نخستین آپلود
  با ۵۰۰ شکست می‌خورد. پس یک استقرارِ فراموش‌شده از build و start هم رد می‌شد و
  خطا در بدترین لحظه دیده می‌شد. اینجا همان را به یک شکستِ زودهنگام تبدیل می‌کنیم.

  فقط «شکل» پیکربندی بررسی می‌شود، نه وجود یا دسترسیِ پوشه: provider خودش مسیر
  را به‌صورت بازگشتی می‌سازد، بررسی دسترسی روی همهٔ سیستم‌ها قابل اتکا نیست
  (کاربر root بیت‌های دسترسی را دور می‌زند)، و preflight عمداً هیچ چیزِ محیط را
  کاوش نمی‌کند. مقدار متغیر هیچ‌جا چاپ نمی‌شود.
*/
const mediaRoot = process.env.MEDIA_STORAGE_ROOT?.trim();

if (!mediaRoot) {
  if (isProduction) {
    problems.push(
      "MEDIA_STORAGE_ROOT در production الزامی است — بدون آن نخستین درخواست تصویر با خطای ۵۰۰ شکست می‌خورد",
    );
  } else {
    notes.push("MEDIA_STORAGE_ROOT تعریف نشده — در توسعه به مسیر موقت سیستم برمی‌گردد");
  }
} else if (!path.isAbsolute(mediaRoot)) {
  if (isProduction) {
    problems.push(
      "MEDIA_STORAGE_ROOT باید مسیر مطلق باشد؛ مسیر نسبی بر پایهٔ پوشهٔ کاری حل می‌شود و با استقرار بعدی از بین می‌رود",
    );
  } else {
    notes.push("MEDIA_STORAGE_ROOT مسیر نسبی است — بر پایهٔ پوشهٔ کاری حل می‌شود (در production مطلق لازم است)");
  }
} else {
  notes.push("MEDIA_STORAGE_ROOT مسیر مطلق است");
}

for (const note of notes) console.log(`✓ ${note}`);

if (problems.length > 0) {
  console.error("");
  for (const problem of problems) console.error(`✖ ${problem}`);
  console.error("\nپیکربندی آماده استقرار نیست.");
  process.exit(1);
}

console.log("\nپیکربندی آماده است. مراحل بعدی: db:migrate ← bootstrap:admin ← build ← start");
