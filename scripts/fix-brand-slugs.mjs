/**
 * =============================================================================
 *  اصلاح نامک برندهای واردشده
 * =============================================================================
 *  واردکننده‌های نخست نامک برند را از چکیدهٔ SHA-256 نام فارسی می‌ساختند، و
 *  نتیجه‌اش آدرس‌هایی مثل /brands/brand-59b40fe8e13238b86a28c330 بود. خودِ
 *  واردکننده‌ها اصلاح شده‌اند، ولی برندهایی که پیش از آن وارد شده‌اند هنوز
 *  همان نامک را دارند؛ این اسکریپت آن‌ها را یک‌بار تغییر نام می‌دهد.
 *
 *  فقط نامک‌هایی را دست می‌زند که دقیقاً الگوی چکیده را دارند. برندی که نامک
 *  دستی یا خوانا دارد — چه از پنل، چه از seed — دست‌نخورده می‌ماند.
 *
 *  اجرا:
 *      node scripts/fix-brand-slugs.mjs            # پیش‌نمایش، چیزی نوشته نمی‌شود
 *      node scripts/fix-brand-slugs.mjs --apply    # اعمال
 * =============================================================================
 */
import "dotenv/config";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import { brandSlug, latinFor } from "./lib/brand-slug.mjs";

const APPLY = process.argv.includes("--apply");

/** نامکی که واردکنندهٔ قدیمی می‌ساخت: brand- و ۲۴ رقم شانزده‌شانزدهی */
const HASHED = /^brand-[0-9a-f]{24}$/;

/* املای لاتینی که خودِ فایل‌های کاتالوگ همراه ردیف‌ها دارند */
const CATALOGS = [
  "batch1-catalog.json",
  "fire-safety-catalog.json",
  "photo-catalog.json",
  "rest-catalog.json",
];
const latinFromCatalogs = {};
for (const file of CATALOGS) {
  const raw = JSON.parse(
    readFileSync(fileURLToPath(new URL(`./data/${file}`, import.meta.url)), "utf8"),
  );
  for (const p of Array.isArray(raw) ? raw : raw.products) {
    if (p.brandFa && p.brandLatin && !latinFromCatalogs[p.brandFa]) {
      latinFromCatalogs[p.brandFa] = p.brandLatin;
    }
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const brands = await q("select id, name, slug, latin_name from brands order by name");
/*
 * نامک‌های گرفته‌شده شامل برندهایی است که قرار نیست تغییر کنند. اگر نامک لاتینِ
 * یک برند با آن‌ها برخورد کند، brandSlug به چکیده برمی‌گردد و ما همان‌جا
 * رهایش می‌کنیم — تغییر ندادن بهتر از یکی کردن دو برند است.
 */
const taken = Object.fromEntries(
  brands.filter((b) => !HASHED.test(b.slug)).map((b) => [b.slug, b.name]),
);

const planned = [];
const skipped = [];
for (const b of brands) {
  if (!HASHED.test(b.slug)) continue;
  const latin = latinFor(b.name, latinFromCatalogs[b.name]);
  const slug = brandSlug(b.name, latinFromCatalogs[b.name], taken);
  if (HASHED.test(slug)) {
    skipped.push(b.name);   // املای لاتین نداریم یا نامکش گرفته شده
    continue;
  }
  taken[slug] = b.name;
  planned.push({ id: b.id, name: b.name, from: b.slug, to: slug, latin });
}

console.log(`\n── ${APPLY ? "اصلاح نامک برند" : "پیش‌نمایش (چیزی نوشته نشد)"} ──\n`);
console.log(`  برند با نامک چکیده············ ${brands.filter((b) => HASHED.test(b.slug)).length}`);
console.log(`  قابل اصلاح···················· ${planned.length}`);
console.log(`  بدون املای لاتین — دست‌نخورده·· ${skipped.length}`);
if (skipped.length) console.log(`     ${skipped.join("، ")}`);
console.log("");
for (const p of planned) {
  console.log(`  ${p.name.padEnd(20)} ${p.from}  →  /brands/${p.to}`);
}

if (!APPLY) {
  console.log(`\n  برای اجرای واقعی همین دستور را با --apply تکرار کنید.\n`);
  await client.end();
  process.exit(0);
}

try {
  await q("BEGIN");
  for (const p of planned) {
    await q("update brands set slug = $1, latin_name = coalesce(latin_name, $2) where id = $3",
      [p.to, p.latin, p.id]);
  }
  await q(
    "insert into activity_logs (action, entity, summary, meta) values ('update','brand',$1,$2)",
    [
      `اصلاح نامک ${planned.length} برند`,
      JSON.stringify({ renamed: planned.map((p) => [p.from, p.to]), skipped }),
    ],
  );
  await q("COMMIT");
  console.log(`\n  ✓ ${planned.length} برند تغییر نام یافت\n`);
} catch (error) {
  await q("ROLLBACK");
  console.error("\n✖ خطا — هیچ تغییری اعمال نشد:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
