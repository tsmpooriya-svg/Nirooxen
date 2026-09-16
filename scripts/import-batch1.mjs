/**
 * =============================================================================
 *  ورود کاتالوگ دستهٔ ۱ — پمپ، منبع، ست کنترل، موتور برق
 * =============================================================================
 *  این اسکریپت افزایشی و idempotent است، دقیقاً با همان قرارداد
 *  import-watertanks.mjs:
 *    • هیچ جدولی TRUNCATE نمی‌شود
 *    • محصولِ موجود بازنویسی نمی‌شود؛ فقط رد می‌شود و گزارش می‌گیرد
 *    • تشخیص تکراری بر اساس slug است
 *    • همه‌چیز داخل یک تراکنش است؛ خطا یعنی ROLLBACK کامل
 *    • محصولات با وضعیت DRAFT وارد می‌شوند تا انتشار دست انسان بماند
 *
 *  هیچ مقداری حدس زده نمی‌شود: قیمت، مدل، مشخصه و برندی که در منبع نبوده
 *  خالی می‌ماند. شرط قیمتی در ستون جداگانه می‌نشیند و در قیمت پایه حل نمی‌شود.
 *
 *  اجرا:  node scripts/import-batch1.mjs [--dry] [--data=path]
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

// این اسکریپت داده می‌نویسد؛ هدف باید محلی باشد یا اپراتور صریحاً تأیید کند.
// حالت آزمایشی چیزی نمی‌نویسد، پس آزاد است.
if (!process.argv.includes("--dry")) assertSafeTarget("import-batch1");

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import { brandSlug, latinFor } from "./lib/brand-slug.mjs";

const DRY = process.argv.includes("--dry");
const DATA =
  process.argv.find((a) => a.startsWith("--data="))?.slice(7) ??
  fileURLToPath(new URL("./data/batch1-catalog.json", import.meta.url));

/** دسته‌های تازه — همه زیر ریشه‌های موجود، جز موتور برق که خانوادهٔ جدیدی است */
const CATEGORIES = [
  { slug: "peripheral-pumps", name: "پمپ محیطی", parent: "pumps", icon: "pump", position: 5 },
  { slug: "twin-impeller-pumps", name: "پمپ دو پروانه", parent: "pumps", icon: "pump", position: 6 },
  { slug: "engine-pumps", name: "موتور پمپ بنزینی", parent: "pumps", icon: "motor-pump", position: 7 },
  { slug: "vessel-diaphragms", name: "تیوپ منبع تحت فشار", parent: "tanks", icon: "tank", position: 8 },
  { slug: "control-sets", name: "ست کنترل پمپ", parent: "instruments", icon: "gauge", position: 1 },
  { slug: "pressure-switches", name: "کلید اتوماتیک فشار", parent: "instruments", icon: "gauge", position: 2 },
  { slug: "pressure-gauges", name: "گیج فشار", parent: "instruments", icon: "gauge", position: 3 },
  { slug: "power-generators", name: "موتور برق و ژنراتور", parent: null, icon: "motor-pump", position: 8 },
];

/** مشخصه‌های تازه — بقیه از قبل در پایگاه داده هستند و دوباره ساخته نمی‌شوند */
const SPEC_DEFS = [
  { key: "phase", label: "فاز برق", type: "TEXT", dim: null, unit: null, group: "موتور", filt: true, ui: "CHECKBOX", pos: 50 },
  { key: "float_switch", label: "فلوتر", type: "BOOLEAN", dim: null, unit: null, group: "ساختار", filt: true, ui: "BOOLEAN", pos: 51 },
  { key: "tube_bore", label: "قطر دهانه", type: "NUMBER", dim: "LENGTH", unit: "mm", group: "ابعاد", filt: true, ui: "RANGE", pos: 52 },
  { key: "tube_height", label: "ارتفاع تیوپ", type: "NUMBER", dim: "LENGTH", unit: "mm", group: "ابعاد", filt: true, ui: "RANGE", pos: 53 },
];

/** فیلترهای هر دستهٔ تازه */
const CATEGORY_FILTERS = {
  "peripheral-pumps": ["head", "flow", "power", "phase", "impeller_material"],
  "twin-impeller-pumps": ["head", "flow", "power", "phase", "size"],
  "engine-pumps": ["flow", "power", "size", "head"],
  "vessel-diaphragms": ["volume", "tube_bore", "tube_height"],
  "control-sets": ["max_pressure", "power", "voltage"],
  "pressure-switches": ["max_pressure", "voltage"],
  "pressure-gauges": ["max_pressure", "size"],
  "power-generators": ["power", "phase", "voltage"],
};

/**
 * طرح هر دسته — عکس واقعی محصول بعداً از پنل جایگزین می‌شود.
 * طرح‌ها همان مجموعهٔ تیرهٔ سایت‌اند، پس کارت‌ها یکدست می‌مانند و دست‌کم نوع
 * کالا از روی تصویر خوانده می‌شود، نه یک قاب یکسان برای همه.
 */
const IMAGE_BY_CATEGORY = {
  "centrifugal-pumps": "/images/products/centrifugal-pump.svg",
  "self-priming-pumps": "/images/products/centrifugal-pump.svg",
  "twin-impeller-pumps": "/images/products/centrifugal-pump.svg",
  "peripheral-pumps": "/images/products/centrifugal-pump.svg",
  "pumps": "/images/products/centrifugal-pump.svg",
  "submersible-pumps": "/images/products/submersible-pump.svg",
  "vertical-multistage": "/images/products/booster-set.svg",
  "circulators": "/images/products/electro-pump.svg",
  "engine-pumps": "/images/products/engine-pump.svg",
  "power-generators": "/images/products/power-generator.svg",
  "control-sets": "/images/products/control-set.svg",
  "pressure-gauges": "/images/products/pressure-gauge.svg",
  "pressure-switches": "/images/products/pressure-switch.svg",
  "instruments": "/images/products/pressure-gauge.svg",
  "pressure-vessels": "/images/products/pressure-tank.svg",
  "vessel-diaphragms": "/images/products/pressure-tank.svg",
  "fittings": "/images/products/pipe-fitting.svg",
  "check-valves": "/images/products/gate-valve.svg",
};
const DEFAULT_IMAGE = "/images/products/generic.svg";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (n) => String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const stat = {
  categoriesAdded: 0, specDefsAdded: 0, categorySpecLinks: 0, brandsAdded: 0,
  productsInserted: 0, productsSkipped: 0, specRows: 0, imageRows: 0,
  priceObservations: 0, unmappedSpecs: 0,
  skipped: [], missingCategory: [],
};

try {
  await q("BEGIN");

  /* 1 ── واحدها باید از قبل باشند؛ چیزی ساخته نمی‌شود */
  const unitBy = Object.fromEntries(
    (await q("select id, code, to_base_factor from units")).map((u) => [u.code, u]),
  );
  for (const d of SPEC_DEFS) {
    if (d.unit && !unitBy[d.unit]) throw new Error(`واحد ${d.unit} در پایگاه داده نیست — متوقف شد`);
  }

  /* 2 ── تعریف مشخصه‌های تازه */
  for (const d of SPEC_DEFS) {
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

  /* 3 ── دسته‌ها */
  for (const c of CATEGORIES) {
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

  /* 4 ── فیلترهای وابسته به دسته */
  for (const [slug, keys] of Object.entries(CATEGORY_FILTERS)) {
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

  /* 5 ── برندها؛ فقط نامی که منبع چاپ کرده. لوگو/کشور جعل نمی‌شود. */
  const products = JSON.parse(readFileSync(DATA, "utf8"));
  const brandRows = await q("select id, name, slug from brands");
  const brandBy = Object.fromEntries(brandRows.map((b) => [b.name, b.id]));
  /* نامک‌های گرفته‌شده — تا املای لاتینِ مشترک دو برند را بی‌صدا یکی نکند */
  const takenSlugs = Object.fromEntries(brandRows.map((b) => [b.slug, b.name]));
  /* املای لاتین از خود کاتالوگ؛ هر برندی که ندارد از جدول brand-slug می‌آید */
  const latinBy = {};
  for (const p of products) {
    if (p.brandFa && p.brandLatin && !latinBy[p.brandFa]) latinBy[p.brandFa] = p.brandLatin;
  }
  const wantedBrands = [...new Set(products.map((p) => p.brandFa).filter(Boolean))];
  for (const name of wantedBrands) {
    if (brandBy[name]) continue;
    const slug = brandSlug(name, latinBy[name], takenSlugs);
    takenSlugs[slug] = name;
    const row = (
      await q(
        "insert into brands (name, slug, latin_name, is_active) values ($1,$2,$3,true)" +
          " on conflict (slug) do nothing returning id",
        [name, slug, latinFor(name, latinBy[name])],
      )
    )[0];
    if (row) { brandBy[name] = row.id; stat.brandsAdded++; continue; }
    // نامک از قبل بود: باید دقیقاً همین برند باشد، وگرنه برخورد است و باید بایستیم.
    const clash = (await q("select id, name from brands where slug = $1", [slug]))[0];
    if (!clash || clash.name !== name) {
      throw new Error(`برخورد نامک برند روی ${slug}: «${name}» با «${clash?.name ?? "?"}» — متوقف شد`);
    }
    brandBy[name] = clash.id;
  }
  // هیچ برندی نباید بی‌صدا گم شود؛ اگر شناسه‌ای نداریم یعنی درج انجام نشده است.
  const lostBrands = wantedBrands.filter((n) => !brandBy[n]);
  if (lostBrands.length) {
    throw new Error(`برند بدون شناسه: ${lostBrands.join("، ")} — متوقف شد`);
  }

  /* 6 ── محصولات */
  for (const p of products) {
    const catId = catBy[p.categorySlug];
    if (!catId) { stat.missingCategory.push([p.slug, p.categorySlug]); continue; }

    if ((await q("select id from products where slug = $1", [p.slug]))[0]) {
      stat.productsSkipped++;
      stat.skipped.push([p.slug, "از قبل وجود دارد — دست نخورد"]);
      continue;
    }

    /*
     * قیمت فقط وقتی نوشته می‌شود که priceMode برابر PUBLIC باشد — همان قاعده‌ای
     * که saveProduct دارد. شرط قیمتی جداگانه ذخیره می‌شود و در عدد حل نمی‌شود.
     */
    const productId = (
      await q(
        "insert into products" +
          " (name, slug, model, category_id, brand_id, status, price_mode, price," +
          "  price_condition_code, price_condition_text, is_promotional, source_ref," +
          "  currency, unit, stock_status, min_order_qty, position)" +
          " values ($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8,$9,$10,$11,'IRT','دستگاه','ORDER_ONLY',1,0)" +
          " returning id",
        [
          p.name, p.slug, p.model, catId, p.brandFa ? brandBy[p.brandFa] ?? null : null,
          p.priceMode, p.priceMode === "PUBLIC" ? p.price : null,
          p.priceConditionCode, p.priceConditionText, Boolean(p.isPromotional), p.sourceRef,
        ],
      )
    )[0].id;
    stat.productsInserted++;

    /* مشخصات — مقدار نوع‌دار و value_base ساخته می‌شود تا محصول از فیلترها نیفتد */
    let pos = 0;
    for (const s of p.specs) {
      const def = s.key ? defBy[s.key] : null;
      if (s.key && !def) stat.unmappedSpecs++;
      if (s.kind === "num") {
        const u = s.unit ? unitBy[s.unit] : null;
        await q(
          "insert into product_specs" +
            " (product_id, definition_id, group_name, label, value, unit, value_num, unit_id, value_base, position, is_key)" +
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

    /* تاریخچهٔ قیمت — مشاهدهٔ هر منبع در هر تاریخ یک‌بار */
    for (const o of p.priceObservations) {
      const r = await q(
        "insert into product_price_observations" +
          " (product_id, source_ref, source_date, raw_price, normalized_price, price_scale," +
          "  final_price, currency, price_status, condition_code)" +
          " values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)" +
          " on conflict (product_id, source_ref, source_date) do nothing returning id",
        [productId, o.sourceRef, o.sourceDate ?? "", o.rawPrice, o.normalizedPrice,
         o.priceScale ?? 1, o.finalPrice, o.currency, o.priceStatus, o.conditionCode],
      );
      if (r.length) stat.priceObservations++;
    }

    /*
     * طرح دسته — دستهٔ ۱ هیچ عکس واقعی محصولی ندارد. طرح نوع کالا گذاشته
     * می‌شود تا کارت محصول در فهرست‌ها خالی نماند؛ با رسیدن عکس واقعی از
     * پنل مدیریت جایگزین می‌شود.
     */
    await q(
      "insert into product_images (product_id, url, alt, position, is_primary)" +
        " values ($1,$2,$3,0,true)",
      [productId, IMAGE_BY_CATEGORY[p.categorySlug] ?? DEFAULT_IMAGE, p.name],
    );
    stat.imageRows++;
  }

  /* 7 ── ثبت در لاگ فعالیت — همان معنایی که پنل مدیریت دارد */
  if (!DRY) {
    await q(
      "insert into activity_logs (action, entity, summary, meta)" +
        " values ('create','product',$1,$2)",
      [
        `ورود کاتالوگ دستهٔ ۱ — ${stat.productsInserted} محصول پیش‌نویس`,
        JSON.stringify({ batch: "batch-1", inserted: stat.productsInserted,
                         skipped: stat.productsSkipped, categories: stat.categoriesAdded,
                         brands: stat.brandsAdded, specs: stat.specRows,
                         priceObservations: stat.priceObservations }),
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
line("مشاهدهٔ قیمت", stat.priceObservations);
line("تصویر جانشین", stat.imageRows);
if (stat.unmappedSpecs) line("مشخصهٔ بدون تعریف", stat.unmappedSpecs);
if (stat.missingCategory.length) {
  console.log("\n  ✖ دستهٔ مقصد پیدا نشد:");
  for (const [s, c] of stat.missingCategory.slice(0, 10)) console.log(`     ${s} → ${c}`);
}
if (stat.skipped.length) {
  console.log(`\n  ردشده‌ها (${stat.skipped.length}):`);
  for (const [s, why] of stat.skipped.slice(0, 8)) console.log(`     ${s} — ${why}`);
  if (stat.skipped.length > 8) console.log(`     … و ${stat.skipped.length - 8} مورد دیگر`);
}
console.log("");
