/**
 * =============================================================================
 *  ورود محصولاتی که در دستهٔ ۱ به‌خاطر «قیمت ناخوانا» کنار مانده بودند
 * =============================================================================
 *  این‌ها ۸۲ محصول هیوندای و توان تک‌اند که در بازبینی دستهٔ ۱ با نشانهٔ
 *  UNREADABLE_IN_SOURCE بلاک شدند. مانعشان قیمت بود، نه هویت: نام، مدل، برند و
 *  دستهٔ همه‌شان خوانا بود. حالا که قیمت از پنل وارد می‌شود، همه ON_REQUEST
 *  وارد می‌شوند و آن مانع بی‌اثر است.
 *
 *  عکس هر محصول از فهرست رسمی همان سازنده بیرون کشیده شده
 *  (scripts/extract-pdf-images.mjs) و با مختصات صفحه به مدل وصل شده است:
 *    imageScope=model   عکس دقیقاً کنار ردیف همان مدل چاپ شده بود
 *    imageScope=family  کاتالوگ برای کل خانواده یک عکس داشت، نه برای هر مدل
 *
 *  دسته و مشخصهٔ تازه‌ای ساخته نمی‌شود؛ همه از قبل موجودند.
 *
 *  اجرا:  node scripts/import-photo-catalog.mjs [--dry] [--data=path]
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

const DRY = process.argv.includes("--dry");
if (!DRY) assertSafeTarget("import-photo-catalog");

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import { brandSlug, latinFor } from "./lib/brand-slug.mjs";

const DATA =
  process.argv.find((a) => a.startsWith("--data="))?.slice(7) ??
  fileURLToPath(new URL("./data/photo-catalog.json", import.meta.url));

const FA = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (n) => String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const stat = {
  brandsAdded: 0, productsInserted: 0, productsSkipped: 0,
  specRows: 0, imageRows: 0, byScope: { model: 0, family: 0 }, skipped: [],
};

try {
  await q("BEGIN");

  const products = JSON.parse(readFileSync(DATA, "utf8"));

  const unitBy = Object.fromEntries(
    (await q("select id, code, label, to_base_factor from units")).map((u) => [u.code, u]),
  );
  const defBy = Object.fromEntries(
    (await q("select id, key from spec_definitions")).map((d) => [d.key, d]),
  );
  const catBy = Object.fromEntries(
    (await q("select id, slug from categories")).map((c) => [c.slug, c.id]),
  );

  /* برندها — فقط نامی که منبع چاپ کرده؛ املای لاتین از جدول تأییدشده می‌آید */
  const brandRows = await q("select id, name, slug from brands");
  const brandBy = Object.fromEntries(brandRows.map((b) => [b.name, b.id]));
  /* نامک‌های گرفته‌شده — تا املای لاتینِ مشترک دو برند را بی‌صدا یکی نکند */
  const takenSlugs = Object.fromEntries(brandRows.map((b) => [b.slug, b.name]));
  const wanted = [...new Set(products.map((p) => p.brandFa).filter(Boolean))];
  for (const name of wanted) {
    if (brandBy[name]) continue;
    const slug = brandSlug(name, null, takenSlugs);
    takenSlugs[slug] = name;
    const row = (
      await q(
        "insert into brands (name, slug, latin_name, is_active) values ($1,$2,$3,true)" +
          " on conflict (slug) do nothing returning id",
        [name, slug, latinFor(name, null)],
      )
    )[0];
    if (row) { brandBy[name] = row.id; stat.brandsAdded++; continue; }
    const clash = (await q("select id, name from brands where slug = $1", [slug]))[0];
    if (!clash || clash.name !== name) {
      throw new Error(`برخورد نامک برند روی ${slug}: «${name}» با «${clash?.name ?? "?"}» — متوقف شد`);
    }
    brandBy[name] = clash.id;
  }
  const lost = wanted.filter((n) => !brandBy[n]);
  if (lost.length) throw new Error(`برند بدون شناسه: ${lost.join("، ")} — متوقف شد`);

  for (const p of products) {
    const catId = catBy[p.categorySlug];
    if (!catId) throw new Error(`دستهٔ ${p.categorySlug} پیدا نشد — متوقف شد`);

    if ((await q("select id from products where slug = $1", [p.slug]))[0]) {
      stat.productsSkipped++;
      stat.skipped.push(p.slug);
      continue;
    }

    const productId = (
      await q(
        "insert into products" +
          " (name, slug, model, category_id, brand_id, status, price_mode, price," +
          "  short_description, description, tags, currency, unit, stock_status," +
          "  min_order_qty, position)" +
          " values ($1,$2,$3,$4,$5,'DRAFT','ON_REQUEST',null,$6,$7,$8,'IRT',$9,'ORDER_ONLY',1,0)" +
          " returning id",
        [p.name, p.slug, p.model, catId, brandBy[p.brandFa] ?? null,
         p.shortDescription, p.description, p.tags, p.unit],
      )
    )[0].id;
    stat.productsInserted++;

    let pos = 0;
    for (const s of p.specs) {
      const def = s.key ? defBy[s.key] ?? null : null;
      if (s.kind === "num") {
        const u = s.unit ? unitBy[s.unit] : null;
        await q(
          "insert into product_specs" +
            " (product_id, definition_id, group_name, label, value, unit, value_num," +
            "  unit_id, value_base, position, is_key)" +
            " values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
          [productId, def?.id ?? null, s.group, s.label, faNum(s.value),
           u?.label ?? null, s.value, u?.id ?? null,
           u ? Number(s.value) * Number(u.to_base_factor) : null, pos++, Boolean(s.isKey)],
        );
      } else if (s.kind === "bool") {
        await q(
          "insert into product_specs" +
            " (product_id, definition_id, group_name, label, value, value_bool, position, is_key)" +
            " values ($1,$2,$3,$4,'دارد',true,$5,$6)",
          [productId, def?.id ?? null, s.group, s.label, pos++, Boolean(s.isKey)],
        );
      } else {
        await q(
          "insert into product_specs" +
            " (product_id, definition_id, group_name, label, value, value_text, position, is_key)" +
            " values ($1,$2,$3,$4,$5,$5,$6,$7)",
          [productId, def?.id ?? null, s.group, s.label, s.value, pos++, Boolean(s.isKey)],
        );
      }
      stat.specRows++;
    }

    /*
     * متن جانشین عکس، دامنهٔ تطبیق را صریح می‌گوید. عکسِ خانواده، عکسِ همان
     * مدل نیست و کاربر باید بتواند این را بفهمد.
     */
    const alt = p.imageScope === "family"
      ? `${p.name} — تصویر خانواده محصول`
      : p.name;
    await q(
      "insert into product_images (product_id, url, alt, position, is_primary)" +
        " values ($1,$2,$3,0,true)",
      [productId, p.image, alt],
    );
    stat.imageRows++;
    stat.byScope[p.imageScope]++;
  }

  if (!DRY) {
    await q(
      "insert into activity_logs (action, entity, summary, meta)" +
        " values ('create','product',$1,$2)",
      [
        `ورود محصولات بلاک‌شدهٔ دستهٔ ۱ — ${stat.productsInserted} محصول پیش‌نویس با عکس`,
        JSON.stringify({ batch: "photo-catalog", inserted: stat.productsInserted,
                         skipped: stat.productsSkipped, brands: stat.brandsAdded,
                         specs: stat.specRows, images: stat.imageRows,
                         imageScope: stat.byScope }),
      ],
    );
  }

  if (DRY) { await q("ROLLBACK"); } else { await q("COMMIT"); }
} catch (error) {
  await q("ROLLBACK");
  console.error("\n✖ خطا — هیچ تغییری اعمال نشد:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

const line = (k, v) => console.log(`  ${k.padEnd(30, "·")} ${v}`);
console.log(`\n${DRY ? "── اجرای آزمایشی (بدون نوشتن) ──" : "── ورود انجام شد ──"}\n`);
line("برند تازه", stat.brandsAdded);
line("محصول واردشده", stat.productsInserted);
line("محصول ردشده (تکراری)", stat.productsSkipped);
line("ردیف مشخصات", stat.specRows);
line("عکس — تطبیق با مدل", stat.byScope.model);
line("عکس — تطبیق با خانواده", stat.byScope.family);
if (stat.skipped.length) {
  console.log(`\n  ردشده‌ها (${stat.skipped.length}):`);
  for (const s of stat.skipped.slice(0, 8)) console.log(`     ${s}`);
}
console.log("");
