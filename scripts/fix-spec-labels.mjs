/**
 * =============================================================================
 *  اصلاح برچسب مشخصات فنی
 * =============================================================================
 *  برچسب‌ها هم در product_specs (روی هر ردیف) و هم در spec_definitions (روی
 *  تعریف) نگهداری می‌شوند، پس اصلاحِ املا باید هر دو را بگیرد وگرنه صفحهٔ
 *  محصول و صافی‌های دسته دو چیز متفاوت نشان می‌دهند.
 *
 *  فایل‌های کاتالوگ هم اصلاح شده‌اند، پس واردات بعدی همین املا را می‌آورد؛
 *  این اسکریپت فقط ردیف‌هایی را می‌گیرد که پیش از آن اصلاح وارد شده‌اند.
 *
 *  اجرا:
 *      node scripts/fix-spec-labels.mjs            # پیش‌نمایش
 *      node scripts/fix-spec-labels.mjs --apply    # اعمال
 * =============================================================================
 */
import "dotenv/config";

import { Client } from "pg";

const APPLY = process.argv.includes("--apply");

/** از → به. هر اصلاح املایی تازه‌ای همین‌جا اضافه می‌شود. */
const CORRECTIONS = [
  ["ورودی / خروجی", "ورودی/خروجی"],
  // فقط فاصلهٔ دور اسلش برداشته می‌شود. این برچسب و برچسب بالا ظاهراً یک چیز
  // را می‌گویند، ولی یکی کردنشان تصمیمی دربارهٔ داده است نه املا، و اینجا
  // گرفته نمی‌شود.
  ["سایز ورودی / خروجی", "سایز ورودی/خروجی"],
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

console.log(`\n── ${APPLY ? "اصلاح برچسب" : "پیش‌نمایش (چیزی نوشته نشد)"} ──\n`);

let total = 0;
for (const [from, to] of CORRECTIONS) {
  const [specs] = await q("select count(*)::int as n from product_specs where label = $1", [from]);
  const [defs] = await q("select count(*)::int as n from spec_definitions where label = $1", [from]);
  total += specs.n + defs.n;
  console.log(`  «${from}» → «${to}»`);
  console.log(`     ردیف مشخصات: ${specs.n} · تعریف مشخصه: ${defs.n}\n`);
}

if (!APPLY) {
  console.log(`  برای اعمال، همین دستور را با --apply تکرار کنید.\n`);
  await client.end();
  process.exit(0);
}

if (total === 0) {
  console.log("  چیزی برای اصلاح نبود.\n");
  await client.end();
  process.exit(0);
}

try {
  await q("BEGIN");
  for (const [from, to] of CORRECTIONS) {
    await q("update product_specs set label = $2 where label = $1", [from, to]);
    await q("update spec_definitions set label = $2 where label = $1", [from, to]);
  }
  await q(
    "insert into activity_logs (action, entity, summary, meta) values ('update','spec',$1,$2)",
    [`اصلاح املای ${total} برچسب مشخصه`, JSON.stringify({ corrections: CORRECTIONS })],
  );
  await q("COMMIT");
  console.log(`\n  ✓ ${total} برچسب اصلاح شد\n`);
} catch (error) {
  await q("ROLLBACK");
  console.error("\n✖ خطا — هیچ تغییری اعمال نشد:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
