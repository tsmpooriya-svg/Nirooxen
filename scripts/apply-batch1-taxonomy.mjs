/**
 * =============================================================================
 *  دسته‌بندی‌ها و برندهای مصوب دستهٔ ۱
 * =============================================================================
 *  فقط ردیف داده اضافه می‌کند — هیچ ستون یا جدولی نمی‌سازد و هیچ ردیف موجودی
 *  را تغییر نمی‌دهد. با اجرای دوباره نتیجه عوض نمی‌شود (بر پایهٔ slug یکتا).
 *
 *  اصول:
 *   • فقط همان دسته‌هایی که تحلیل دستهٔ ۱ تأیید کرده — بدون دستهٔ اضافه
 *   • ساختار دوسطحی حفظ می‌شود؛ هیچ سطح سومی ساخته نمی‌شود
 *   • برند فقط وقتی ساخته می‌شود که املای آن در منبع مستند باشد
 *   • هیچ املای لاتینی حدس زده نمی‌شود و هیچ نوع نویسه‌گردانی خودکار نیست
 *   • هیچ لوگو/کشور/وب‌سایتی جعل نمی‌شود
 *
 *  اجرا:
 *      node scripts/apply-batch1-taxonomy.mjs           # اجرای واقعی
 *      node scripts/apply-batch1-taxonomy.mjs --dry-run # فقط گزارش
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

const DRY = process.argv.includes("--dry-run");
if (!DRY) assertSafeTarget("apply-batch1-taxonomy");

const { Client } = await import("pg");

/** زیرشاخه‌های مصوب زیر ریشه‌های موجود */
const SUBCATEGORIES = [
  { slug: "peripheral-pumps", name: "پمپ محیطی", parent: "pumps", icon: "pump", position: 5 },
  { slug: "twin-impeller-pumps", name: "پمپ دو پروانه", parent: "pumps", icon: "pump", position: 6 },
  { slug: "engine-pumps", name: "موتور پمپ بنزینی", parent: "pumps", icon: "motor-pump", position: 7 },
  { slug: "vessel-diaphragms", name: "تیوپ منبع تحت فشار", parent: "tanks", icon: "tank", position: 3 },
  { slug: "control-sets", name: "ست کنترل پمپ", parent: "instruments", icon: "gauge", position: 1 },
  { slug: "pressure-switches", name: "کلید اتوماتیک فشار", parent: "instruments", icon: "gauge", position: 2 },
  { slug: "pressure-gauges", name: "گیج فشار", parent: "instruments", icon: "gauge", position: 3 },
];

/** تنها ریشهٔ جدید مصوب */
const ROOTS = [
  { slug: "power-generators", name: "موتور برق و ژنراتور", icon: "motor-pump", position: 8 },
];

/**
 * برندهای دستهٔ ۱. `name` همان چیزی است که در منبع چاپ شده.
 * `latin` فقط وقتی پر است که در خود منبع دیده شده باشد؛ در غیر این صورت null
 * می‌ماند تا کسی بعداً آن را از روی حدس پر نکند.
 */
const BRANDS = [
  { fa: "راین", latin: null }, { fa: "زاگرس", latin: null }, { fa: "یاکاموز", latin: null },
  { fa: "یاقوت", latin: null }, { fa: "اسپینا", latin: null }, { fa: "ویگو", latin: null },
  { fa: "ورما", latin: null }, { fa: "ناکایو", latin: null }, { fa: "پارامونت", latin: null },
  { fa: "فیلینک", latin: null }, { fa: "سوارکس", latin: null }, { fa: "ایکار", latin: null },
  { fa: "هاچاسو", latin: null }, { fa: "یوفا", latin: null }, { fa: "وگو", latin: null },
  { fa: "موتوژن", latin: null }, { fa: "فونته کرون", latin: null }, { fa: "جیتو", latin: null },
  { fa: "پرسیکا", latin: null }, { fa: "یوفو", latin: null }, { fa: "لورا", latin: null },
  { fa: "تیموکس", latin: null }, { fa: "اینفینیتی", latin: null }, { fa: "اسپیل", latin: null },
  { fa: "تراویس", latin: null }, { fa: "استریم", latin: null }, { fa: "وینسنت", latin: null },
  { fa: "رایوال", latin: null }, { fa: "فوکا", latin: null }, { fa: "روبین", latin: null },
  { fa: "ونیکو", latin: null }, { fa: "نینجا", latin: null }, { fa: "آنشی", latin: null },
  { fa: "هافل", latin: null }, { fa: "کوشا", latin: null }, { fa: "دلتا", latin: null },
  { fa: "ناتالی", latin: null }, { fa: "میلانو", latin: null },
  // این‌ها املای لاتین را خودِ منبع چاپ کرده است
  { fa: "وتو", latin: "Vetto" }, { fa: "وال", latin: "WHALE" },
  { fa: "هیوندای", latin: "Hyundai" }, { fa: "توان تک", latin: "Tavan Tak" },
  { fa: "زیلمت", latin: "Zilmet" }, { fa: "زاگ", latin: "ZOG" },
  { fa: "توکیو", latin: "Tokyo" }, { fa: "ای بی آر", latin: "ABR" },
];

/** slug فارسی‌پسند — همان قرارداد src/lib/utils.ts */
function slugify(input) {
  return input
    .trim()
    .replace(/[‌‏‎]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let addedRoots = 0, addedSubs = 0, addedBrands = 0, skipped = 0;

async function idOfSlug(slug) {
  const r = await client.query("select id from categories where slug = $1", [slug]);
  return r.rows[0]?.id ?? null;
}

try {
  if (!DRY) await client.query("begin");

  for (const root of ROOTS) {
    if (await idOfSlug(root.slug)) { skipped++; continue; }
    if (!DRY) {
      await client.query(
        `insert into categories (name, slug, icon, position, is_active) values ($1,$2,$3,$4,true)`,
        [root.name, root.slug, root.icon, root.position],
      );
    }
    addedRoots++;
    console.log(`  + ریشه  ${root.slug}  ${root.name}`);
  }

  for (const sub of SUBCATEGORIES) {
    if (await idOfSlug(sub.slug)) { skipped++; continue; }
    const parentId = await idOfSlug(sub.parent);
    if (!parentId) throw new Error(`دستهٔ والد یافت نشد: ${sub.parent}`);
    if (!DRY) {
      await client.query(
        `insert into categories (name, slug, parent_id, icon, position, is_active) values ($1,$2,$3,$4,$5,true)`,
        [sub.name, sub.slug, parentId, sub.icon, sub.position],
      );
    }
    addedSubs++;
    console.log(`  + زیرشاخه ${sub.slug}  ${sub.name}  ← ${sub.parent}`);
  }

  for (const brand of BRANDS) {
    const slug = brand.latin ? slugify(brand.latin) : slugify(brand.fa);
    const exists = await client.query(
      "select id from brands where slug = $1 or name = $2",
      [slug, brand.fa],
    );
    if (exists.rowCount > 0) { skipped++; continue; }
    if (!DRY) {
      await client.query(
        `insert into brands (name, slug, latin_name, is_active) values ($1,$2,$3,true)`,
        [brand.fa, slug, brand.latin],
      );
    }
    addedBrands++;
  }

  if (!DRY) await client.query("commit");
} catch (error) {
  if (!DRY) await client.query("rollback");
  console.error("خطا — هیچ تغییری اعمال نشد:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `\n${DRY ? "[آزمایشی] " : ""}ریشه: ${addedRoots} · زیرشاخه: ${addedSubs} · برند: ${addedBrands} · از قبل موجود: ${skipped}`,
);
