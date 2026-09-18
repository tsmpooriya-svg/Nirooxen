/**
 * یکدست‌سازی تایپوگرافی ارقام نام محصولات منتشرشده.
 *
 * پیش‌فرض: فقط گزارش. برای نوشتن واقعی: --apply
 * نمونه:
 *   node scripts/normalize-product-names.mjs
 *   node scripts/normalize-product-names.mjs --apply
 *   node scripts/normalize-product-names.mjs --apply --limit=20
 *
 * فقط ستون products.name تغییر می‌کند. مدل، SKU، توضیح، متا و slug دست‌نخورده‌اند.
 * شناسه‌های لاتین/مدل‌ها طبق normalize-product-name.mjs حفظ می‌شوند.
 */
import "dotenv/config";
import { Client } from "pg";
import { normalizeProductNameDigits } from "./lib/normalize-product-name.mjs";
import { assertSafeTarget } from "./guard-destructive.mjs";

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.slice(8))) : null;
if (limit !== null && !Number.isInteger(limit)) throw new Error("--limit باید عدد صحیح باشد");
if (APPLY) assertSafeTarget("normalize-product-names");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const result = await client.query(
    `select id, name, model, sku
       from products
      where status = 'PUBLISHED'
        and name ~ '[0-9]'
      order by name
      ${limit ? "limit $1" : ""}`,
    limit ? [limit] : [],
  );

  const changes = result.rows
    .map((row) => ({ ...row, normalized: normalizeProductNameDigits(row.name) }))
    .filter((row) => row.normalized !== row.name);

  console.log(APPLY ? "✍️  اجرای واقعی" : "🔍 گزارش آزمایشی — چیزی نوشته نمی‌شود");
  console.log(`نام‌های دارای رقم لاتین بررسی‌شده: ${result.rows.length}`);
  console.log(`نام‌هایی که واقعاً تغییر می‌کنند: ${changes.length}`);

  for (const row of changes) {
    console.log(`\n${row.name}\n→ ${row.normalized}`);
  }

  if (APPLY && changes.length) {
    await client.query("begin");
    try {
      for (const row of changes) {
        await client.query(
          "update products set name = $1, updated_at = now() where id = $2",
          [row.normalized, row.id],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
    console.log(`\n✓ ${changes.length} نام به‌روزرسانی شد.`);
  }
} finally {
  await client.end();
}
