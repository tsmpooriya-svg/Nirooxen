/**
 * =============================================================================
 *  ورود کاتالوگ آتش‌نشانی و ایمنی
 * =============================================================================
 *  خانوادهٔ تازه‌ای زیر ریشهٔ «تجهیزات آتش‌نشانی و ایمنی» می‌سازد و محصولات آن
 *  را وارد می‌کند. مثل import-batch1.mjs:
 *    • هیچ جدولی TRUNCATE نمی‌شود
 *    • محصولِ موجود بازنویسی نمی‌شود؛ فقط رد می‌شود
 *    • تشخیص تکراری بر اساس slug است
 *    • همه‌چیز در یک تراکنش؛ خطا یعنی ROLLBACK کامل
 *    • محصولات DRAFT وارد می‌شوند تا انتشار دست انسان بماند
 *
 *  قیمت هیچ محصولی نوشته نمی‌شود: همه ON_REQUEST هستند تا قیمت‌گذاری از پنل
 *  انجام شود. برند فقط برای محصولاتی ثبت می‌شود که منبع نامشان را گفته است؛
 *  برای بقیه خالی می‌ماند و حدس زده نمی‌شود.
 *
 *  اجرا:  node scripts/import-fire-safety.mjs [--dry] [--data=path]
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

if (!process.argv.includes("--dry")) assertSafeTarget("import-fire-safety");

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import { brandSlug, latinFor } from "./lib/brand-slug.mjs";

const DRY = process.argv.includes("--dry");
const DATA =
  process.argv.find((a) => a.startsWith("--data="))?.slice(7) ??
  fileURLToPath(new URL("./data/fire-safety-catalog.json", import.meta.url));

/* تصویر هر محصول در دادهٔ کاتالوگ آمده و طرحِ خانوادهٔ خودش است؛
   fire-generic فقط پشتیبانِ خانواده‌ای است که طرح اختصاصی ندارد. */
const FALLBACK_IMAGE = "/images/products/fire-generic.svg";

/* ستون value متن دیدنی است و بقیهٔ سایت ارقام فارسی نشان می‌دهد؛
   value_num عدد واقعی را برای فیلتر و مرتب‌سازی نگه می‌دارد. */
const FA = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (n) => String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const stat = {
  categoriesAdded: 0, specDefsAdded: 0, categorySpecLinks: 0, brandsAdded: 0,
  productsInserted: 0, productsSkipped: 0, specRows: 0, imageRows: 0,
  skipped: [],
};

try {
  await q("BEGIN");

  const data = JSON.parse(readFileSync(DATA, "utf8"));

  /* 1 ── واحدها باید از قبل باشند */
  const unitBy = Object.fromEntries(
    (await q("select id, code, label, to_base_factor from units")).map((u) => [u.code, u]),
  );
  for (const d of data.specDefs) {
    if (d.unit && !unitBy[d.unit]) throw new Error(`واحد ${d.unit} در پایگاه داده نیست — متوقف شد`);
  }

  /* 2 ── تعریف مشخصه‌های تازه */
  for (const d of data.specDefs) {
    if ((await q("select id from spec_definitions where key = $1", [d.key]))[0]) continue;
    await q(
      "insert into spec_definitions" +
        " (key, label, data_type, dimension, default_unit_id, group_name, is_filterable, filter_ui, is_active, position)" +
        " values ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)",
      [d.key, d.label, d.type, d.dim, d.unit ? unitBy[d.unit].id : null, d.group, d.filt, d.ui, d.pos],
    );
    stat.specDefsAdded++;
  }
  const defBy = Object.fromEntries(
    (await q("select id, key from spec_definitions")).map((d) => [d.key, d]),
  );

  /* 3 ── ریشه و زیردسته‌ها */
  let rootId = (await q("select id from categories where slug = $1", [data.root.slug]))[0]?.id;
  if (!rootId) {
    rootId = (
      await q(
        "insert into categories (name, slug, parent_id, icon, position, is_active, is_featured)" +
          " values ($1,$2,null,$3,$4,true,false) returning id",
        [data.root.name, data.root.slug, data.root.icon, data.root.position],
      )
    )[0].id;
    stat.categoriesAdded++;
  }
  for (const c of data.subs) {
    if ((await q("select id from categories where slug = $1", [c.slug]))[0]) continue;
    await q(
      "insert into categories (name, slug, parent_id, icon, position, is_active, is_featured)" +
        " values ($1,$2,$3,$4,$5,true,false)",
      [c.name, c.slug, rootId, data.root.icon, c.position],
    );
    stat.categoriesAdded++;
  }
  const catBy = Object.fromEntries(
    (await q("select id, slug from categories")).map((c) => [c.slug, c.id]),
  );

  /* 4 ── فیلترهای وابسته به دسته */
  for (const [slug, keys] of Object.entries(data.categoryFilters)) {
    if (!catBy[slug]) continue;
    for (const [i, key] of keys.entries()) {
      if (!defBy[key]) continue;
      const r = await q(
        "insert into category_specs (category_id, definition_id, is_filterable, is_key, position)" +
          " values ($1,$2,true,$3,$4) on conflict (category_id, definition_id) do nothing returning id",
        [catBy[slug], defBy[key].id, i < 2, i],
      );
      if (r.length) stat.categorySpecLinks++;
    }
  }

  /* 5 ── برندها؛ فقط نامی که منبع گفته. املای لاتین از جدول تأییدشده می‌آید. */
  const brandRows = await q("select id, name, slug from brands");
  const brandBy = Object.fromEntries(brandRows.map((b) => [b.name, b.id]));
  /* نامک‌های گرفته‌شده — تا املای لاتینِ مشترک دو برند را بی‌صدا یکی نکند */
  const takenSlugs = Object.fromEntries(brandRows.map((b) => [b.slug, b.name]));
  const wanted = [...new Set(data.products.map((p) => p.brandFa).filter(Boolean))];
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

  /* 6 ── محصولات */
  for (const p of data.products) {
    const catId = catBy[p.categorySlug];
    if (!catId) throw new Error(`دستهٔ ${p.categorySlug} پیدا نشد — متوقف شد`);

    if ((await q("select id from products where slug = $1", [p.slug]))[0]) {
      stat.productsSkipped++;
      stat.skipped.push(p.slug);
      continue;
    }

    /*
     * قیمت نوشته نمی‌شود: هر محصول ON_REQUEST وارد می‌شود تا اپراتور قیمت را
     * از پنل بگذارد. همان قاعدهٔ saveProduct که فقط برای PUBLIC قیمت می‌نویسد.
     */
    const productId = (
      await q(
        "insert into products" +
          " (name, slug, model, category_id, brand_id, status, price_mode, price," +
          "  short_description, description, tags, currency, unit, stock_status," +
          "  min_order_qty, position)" +
          " values ($1,$2,$3,$4,$5,'DRAFT','ON_REQUEST',null,$6,$7,$8,'IRT',$9,'ORDER_ONLY',1,0)" +
          " returning id",
        [p.name, p.slug, p.model, catId, p.brandFa ? brandBy[p.brandFa] : null,
         p.shortDescription, p.description, p.tags, p.unit],
      )
    )[0].id;
    stat.productsInserted++;

    /* مشخصات — value_base ساخته می‌شود تا محصول از فیلترهای عددی نیفتد */
    let pos = 0;
    for (const s of p.specs) {
      const def = defBy[s.key] ?? null;
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

    /* طرح خانوادگی تا رسیدن عکس واقعی محصول از پنل */
    await q(
      "insert into product_images (product_id, url, alt, position, is_primary)" +
        " values ($1,$2,$3,0,true)",
      [productId, p.image ?? FALLBACK_IMAGE, p.name],
    );
    stat.imageRows++;
  }

  /* 7 ── ثبت در لاگ فعالیت */
  if (!DRY) {
    await q(
      "insert into activity_logs (action, entity, summary, meta)" +
        " values ('create','product',$1,$2)",
      [
        `ورود کاتالوگ آتش‌نشانی — ${stat.productsInserted} محصول پیش‌نویس`,
        JSON.stringify({ batch: "fire-safety", inserted: stat.productsInserted,
                         skipped: stat.productsSkipped, categories: stat.categoriesAdded,
                         brands: stat.brandsAdded, specs: stat.specRows }),
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

const line = (k, v) => console.log(`  ${k.padEnd(28, "·")} ${v}`);
console.log(`\n${DRY ? "── اجرای آزمایشی (بدون نوشتن) ──" : "── ورود انجام شد ──"}\n`);
line("دستهٔ تازه", stat.categoriesAdded);
line("تعریف مشخصهٔ تازه", stat.specDefsAdded);
line("پیوند فیلتر دسته", stat.categorySpecLinks);
line("برند تازه", stat.brandsAdded);
line("محصول واردشده", stat.productsInserted);
line("محصول ردشده (تکراری)", stat.productsSkipped);
line("ردیف مشخصات", stat.specRows);
line("تصویر جانشین", stat.imageRows);
if (stat.skipped.length) {
  console.log(`\n  ردشده‌ها (${stat.skipped.length}):`);
  for (const s of stat.skipped.slice(0, 8)) console.log(`     ${s}`);
  if (stat.skipped.length > 8) console.log(`     … و ${stat.skipped.length - 8} مورد دیگر`);
}
console.log("");
