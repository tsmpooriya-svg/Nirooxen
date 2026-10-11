/**
 * =============================================================================
 *  اصلاح واژهٔ تکرارشده در متن محصولات
 * =============================================================================
 *  در متن ۱۲ محصول اسپرینکلر، «با واکنش واکنش سریع» نوشته شده بود. علتش در
 *  داده‌های ورودی بود: قالبِ «با واکنش {مقدار}» با مقداری پر شده که خودش
 *  «واکنش سریع» است. فایل داده اصلاح شد، ولی ردیف‌هایی که قبلاً وارد شده‌اند
 *  با همان متن مانده‌اند — و همین متن حالا در meta description هم می‌نشیند.
 *
 *  دامنهٔ کار عمداً تنگ است: فقط همین یک الگو، و فقط وقتی واقعاً تکرار باشد.
 *  «سی سی» (سانتی‌متر مکعب) هم در کاتالوگ هست و تکرارِ درستی است؛ قاعدهٔ عمومیِ
 *  «هر واژهٔ تکراری» آن را هم خراب می‌کرد.
 *
 *  اجرا:
 *      node scripts/fix-doubled-words.mjs            پیش‌نمایش
 *      node scripts/fix-doubled-words.mjs --apply    اعمال
 * =============================================================================
 */
import "dotenv/config";

import { Client } from "pg";

const APPLY = process.argv.includes("--apply");

/** الگوهای شناخته‌شده و تأییدشده — نه قاعده‌ای که خودش حدس بزند */
const FIXES = [{ from: "واکنش واکنش سریع", to: "واکنش سریع" }];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log(`\n${APPLY ? "── اصلاح متن ──" : "── پیش‌نمایش (چیزی نوشته نشد) ──"}\n`);

let touched = 0;

for (const fix of FIXES) {
  const { rows } = await client.query(
    `select id, name, short_description, description
       from products
      where short_description like $1 or description like $1`,
    [`%${fix.from}%`],
  );

  console.log(`  «${fix.from}» → «${fix.to}» · ${rows.length} محصول`);
  for (const row of rows.slice(0, 3)) {
    const sample = (row.short_description ?? row.description ?? "").replace(fix.from, fix.to);
    console.log(`     ${row.name.slice(0, 40)}  →  ${sample.slice(0, 70)}…`);
  }

  if (APPLY && rows.length > 0) {
    const { rowCount } = await client.query(
      `update products
          set short_description = replace(short_description, $1, $2),
              description       = replace(description, $1, $2),
              updated_at        = now()
        where short_description like $3 or description like $3`,
      [fix.from, fix.to, `%${fix.from}%`],
    );
    touched += rowCount ?? 0;
  }
}

if (APPLY) {
  console.log(`\n  ✓ ${touched} محصول اصلاح شد.`);
  console.log("  برای دیده شدن: npm run build && sudo systemctl restart nirooxen\n");
} else {
  console.log("\n  برای اجرای واقعی:  node scripts/fix-doubled-words.mjs --apply\n");
}

await client.end();
