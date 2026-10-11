/**
 * =============================================================================
 *  جایگزینی تصاویر مخازن آب با تصاویر جانشین نیروژن
 * =============================================================================
 *  تصاویر واردشده از منبع، واترمارک شرکت دیگری داشتند و قابل انتشار نبودند.
 *  این اسکریپت ارجاع‌های تصویر هر مخزن را با یک تصویر جانشین «نقشه فنی»
 *  متناسب با خانواده همان مخزن جایگزین می‌کند.
 *
 *  • هیچ محصولی، مشخصه‌ای یا دسته‌ای حذف یا تغییر داده نمی‌شود
 *  • فقط جدول product_images برای محصولات مخزن دست می‌خورد
 *  • idempotent است؛ اجرای دوباره نتیجه یکسان می‌دهد
 *  • تراکنشی است؛ خطا یعنی ROLLBACK کامل
 *
 *  اجرا:  node scripts/replace-watertank-images.mjs [--dry]
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

// این اسکریپت داده می‌نویسد؛ هدف باید محلی باشد یا اپراتور صریحاً تأیید کند.
// حالت آزمایشی چیزی نمی‌نویسد، پس آزاد است.
if (!process.argv.includes("--dry")) assertSafeTarget("replace-watertank-images");
import { Client } from "pg";

const DRY = process.argv.includes("--dry");

/** slug دسته → تصویر جانشین خانواده */
const PLACEHOLDER_BY_CATEGORY = {
  "vertical-tanks": "/images/products/tank-vertical.svg",
  "horizontal-tanks": "/images/products/tank-horizontal.svg",
  "booklike-tanks": "/images/products/tank-booklike.svg",
  "spherical-tanks": "/images/products/tank-spherical.svg",
  "cubic-tanks": "/images/products/tank-cubic.svg",
  "underthestairs-tanks": "/images/products/tank-underthestairs.svg",
};

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const stat = { productsTouched: 0, rowsRemoved: 0, rowsInserted: 0, byCategory: {}, unmatched: [] };

try {
  await q("BEGIN");

  for (const [slug, placeholder] of Object.entries(PLACEHOLDER_BY_CATEGORY)) {
    const products = await q(
      "select p.id, p.name from products p join categories c on c.id = p.category_id where c.slug = $1",
      [slug],
    );

    for (const p of products) {
      const removed = await q(
        "delete from product_images where product_id = $1 returning id",
        [p.id],
      );
      await q(
        "insert into product_images (product_id, url, alt, position, is_primary)" +
          " values ($1, $2, $3, 0, true)",
        [p.id, placeholder, p.name],
      );
      stat.rowsRemoved += removed.length;
      stat.rowsInserted += 1;
      stat.productsTouched += 1;
    }
    stat.byCategory[slug] = products.length;
  }

  /* هیچ ارجاعی به پوشه واترمارک‌دار نباید باقی بماند */
  const leftovers = await q(
    "select p.slug, i.url from product_images i join products p on p.id = i.product_id" +
      " where i.url like '%/watertanks/%'",
  );
  if (leftovers.length) {
    stat.unmatched = leftovers.map((r) => r.slug + " -> " + r.url);
    throw new Error("still " + leftovers.length + " references to the imported image folder");
  }

  if (DRY) {
    await q("ROLLBACK");
    console.log("DRY RUN — rolled back, database unchanged");
  } else {
    await q("COMMIT");
    console.log("COMMITTED");
  }
} catch (error) {
  await q("ROLLBACK").catch(() => {});
  console.error("FAILED — rolled back:", error.message);
  process.exitCode = 1;
} finally {
  console.log(JSON.stringify(stat, null, 1));
  await client.end();
}
