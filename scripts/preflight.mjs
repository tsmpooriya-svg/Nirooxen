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

for (const note of notes) console.log(`✓ ${note}`);

if (problems.length > 0) {
  console.error("");
  for (const problem of problems) console.error(`✖ ${problem}`);
  console.error("\nپیکربندی آماده استقرار نیست.");
  process.exit(1);
}

console.log("\nپیکربندی آماده است. مراحل بعدی: db:migrate ← bootstrap:admin ← build ← start");
