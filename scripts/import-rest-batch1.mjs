/**
 * =============================================================================
 *  ورود باقی‌ماندهٔ دستهٔ ۱
 * =============================================================================
 *  دو گروهی که در ورود نخست جا ماندند:
 *
 *   الف) ۲۴ محصول بلاک‌شده. قیمتشان ناخوانا یا پرت بود، یا نامشان در منبع
 *        کوتاه چاپ شده بود. طبق تصمیم اپراتور همه با «استعلام» وارد می‌شوند.
 *        نام کوتاه از برند، دستهٔ چاپ‌شده و کد مدلِ همان منبع بازسازی شده؛
 *        هیچ واژه‌ای از خودمان اضافه نشده است.
 *
 *   ب) ۳۰ محصول که قیمت سالم داشتند ولی در سایت دسته‌ای نداشتند — علف‌تراش،
 *      تیلر، سمپاش، کارواش و گازوییل‌کش. این‌ها با قیمت واقعی خودشان وارد
 *      می‌شوند و دو ریشهٔ تازه با پنج زیرشاخه برایشان ساخته می‌شود.
 *
 *  قیمت فقط وقتی نوشته می‌شود که priceMode برابر PUBLIC باشد — همان قاعده‌ای
 *  که saveProduct در پنل دارد.
 *
 *  اجرا:  node scripts/import-rest-batch1.mjs [--dry] [--data=path]
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

const DRY = process.argv.includes("--dry");
if (!DRY) assertSafeTarget("import-rest-batch1");

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const DATA =
  process.argv.find((a) => a.startsWith("--data="))?.slice(7) ??
  fileURLToPath(new URL("./data/rest-catalog.json", import.meta.url));

const FA = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (n) => String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const stat = {
  categoriesAdded: 0, categorySpecLinks: 0, brandsAdded: 0,
  productsInserted: 0, productsSkipped: 0, specRows: 0, imageRows: 0,
  priced: 0, onRequest: 0, skipped: [],
};

try {
  await q("BEGIN");

  const data = JSON.parse(readFileSync(DATA, "utf8"));

  /* 1 ── واحدها و تعریف مشخصه‌ها از قبل موجودند؛ چیزی ساخته نمی‌شود */
  const unitBy = Object.fromEntries(
    (await q("select id, code, label, to_base_factor from units")).map((u) => [u.code, u]),
  );
  const defBy = Object.fromEntries(
    (await q("select id, key from spec_definitions")).map((d) => [d.key, d]),
  );

  /* 2 ── دسته‌های تازه — ریشه‌ها پیش از فرزندانشان در فهرست آمده‌اند */
  for (const c of data.categories) {
    if ((await q("select id from categories where slug = $1", [c.slug]))[0]) continue;
    let parentId = null;
    if (c.parent) {
      const p = (await q("select id from categories where slug = $1", [c.parent]))[0];
      if (!p) throw new Error(`دستهٔ والد ${c.parent} پیدا نشد — متوقف شد`);
      parentId = p.id;
    }
    await q(
      "insert into categories (name, slug, parent_id, icon, position, is_active, is_featured)" +
        " values ($1,$2,$3,$4,$5,true,false)",
      [c.name, c.slug, parentId, c.icon, c.position],
    );
    stat.categoriesAdded++;
  }
  const catBy = Object.fromEntries(
    (await q("select id, slug from categories")).map((c) => [c.slug, c.id]),
  );

  /* 3 ── فیلترهای وابسته به دسته */
  for (const [slug, keys] of Object.entries(data.categoryFilters ?? {})) {
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

  /* 4 ── برندها؛ فقط نامی که منبع چاپ کرده */
  const brandBy = Object.fromEntries(
    (await q("select id, name from brands")).map((b) => [b.name, b.id]),
  );
  const wanted = [...new Set(data.products.map((p) => p.brandFa).filter(Boolean))];
  for (const name of wanted) {
    if (brandBy[name]) continue;
    const slug = "brand-" + createHash("sha256").update(name, "utf8").digest("hex").slice(0, 24);
    const row = (
      await q(
        "insert into brands (name, slug, is_active) values ($1,$2,true)" +
          " on conflict (slug) do nothing returning id",
        [name, slug],
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

  /* 5 ── محصولات */
  for (const p of data.products) {
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
          " values ($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8,$9,$10,'IRT',$11,'ORDER_ONLY',1,0)" +
          " returning id",
        [p.name, p.slug, p.model, catId, p.brandFa ? brandBy[p.brandFa] : null,
         p.priceMode, p.priceMode === "PUBLIC" ? p.price : null,
         p.shortDescription, p.description, p.tags, p.unit],
      )
    )[0].id;
    stat.productsInserted++;
    if (p.priceMode === "PUBLIC") stat.priced++; else stat.onRequest++;

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

    await q(
      "insert into product_images (product_id, url, alt, position, is_primary)" +
        " values ($1,$2,$3,0,true)",
      [productId, p.image, p.name],
    );
    stat.imageRows++;
  }

  if (!DRY) {
    await q(
      "insert into activity_logs (action, entity, summary, meta)" +
        " values ('create','product',$1,$2)",
      [
        `ورود باقی‌ماندهٔ دستهٔ ۱ — ${stat.productsInserted} محصول پیش‌نویس`,
        JSON.stringify({ batch: "rest-batch1", inserted: stat.productsInserted,
                         skipped: stat.productsSkipped, categories: stat.categoriesAdded,
                         brands: stat.brandsAdded, specs: stat.specRows,
                         priced: stat.priced, onRequest: stat.onRequest }),
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
line("دستهٔ تازه", stat.categoriesAdded);
line("پیوند فیلتر دسته", stat.categorySpecLinks);
line("برند تازه", stat.brandsAdded);
line("محصول واردشده", stat.productsInserted);
line("  با قیمت", stat.priced);
line("  با استعلام", stat.onRequest);
line("محصول ردشده (تکراری)", stat.productsSkipped);
line("ردیف مشخصات", stat.specRows);
line("تصویر", stat.imageRows);
if (stat.skipped.length) {
  console.log(`\n  ردشده‌ها (${stat.skipped.length}):`);
  for (const s of stat.skipped.slice(0, 8)) console.log(`     ${s}`);
}
console.log("");
