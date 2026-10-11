/**
 * =============================================================================
 *  ورود کاتالوگ مخازن آب — منبع: plastonic.com/product-category/watertanks
 * =============================================================================
 *  این اسکریپت افزایشی و idempotent است:
 *    • هیچ جدولی TRUNCATE نمی‌شود
 *    • محصولات موجود حذف یا بازنویسی نمی‌شوند
 *    • تشخیص تکراری بر اساس slug است؛ اجرای دوباره فقط به‌روزرسانی می‌کند
 *    • همه‌چیز داخل یک تراکنش است؛ خطا یعنی ROLLBACK کامل
 *
 *  اجرا:  node scripts/import-watertanks.mjs [--dry] [--data=path]
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

// این اسکریپت داده می‌نویسد؛ هدف باید محلی باشد یا اپراتور صریحاً تأیید کند.
// حالت آزمایشی چیزی نمی‌نویسد، پس آزاد است.
if (!process.argv.includes("--dry")) assertSafeTarget("import-watertanks");
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const DRY = process.argv.includes("--dry");
/** داده استخراج‌شده از منبع، کنار همین اسکریپت نگهداری می‌شود تا ورود دوباره قابل تکرار باشد */
const DATA =
  process.argv.find((a) => a.startsWith("--data="))?.slice(7) ??
  fileURLToPath(new URL("./data/watertanks.json", import.meta.url));

const FAMILIES = [
  { slug: "horizontal-tanks", name: "مخازن افقی", src: "horizontal", position: 1 },
  { slug: "underthestairs-tanks", name: "مخازن زیرپله", src: "underthestairs", position: 2 },
  { slug: "vertical-tanks", name: "مخازن عمودی", src: "vertical", position: 3 },
  { slug: "booklike-tanks", name: "مخازن کتابی", src: "booklike", position: 4 },
  { slug: "spherical-tanks", name: "مخازن کروی", src: "spherical", position: 5 },
  { slug: "cubic-tanks", name: "مخازن مکعبی", src: "cubic", position: 6 },
];

/** مشخصه‌های تازه — «حجم» و «جنس بدنه» از قبل وجود دارند و دوباره ساخته نمی‌شوند */
const SPEC_DEFS = [
  { key: "height", label: "ارتفاع", dim: "LENGTH", unit: "cm", group: "ابعاد", filt: true, ui: "RANGE", pos: 40 },
  { key: "length", label: "طول", dim: "LENGTH", unit: "cm", group: "ابعاد", filt: true, ui: "RANGE", pos: 41 },
  { key: "width", label: "عرض", dim: "LENGTH", unit: "cm", group: "ابعاد", filt: true, ui: "RANGE", pos: 42 },
  { key: "diameter", label: "قطر", dim: "LENGTH", unit: "cm", group: "ابعاد", filt: true, ui: "RANGE", pos: 43 },
  { key: "lid_diameter", label: "قطر درب", dim: "LENGTH", unit: "cm", group: "ابعاد", filt: false, ui: "NONE", pos: 44 },
  { key: "hatch_diameter", label: "قطر دریچه", dim: "LENGTH", unit: "cm", group: "ابعاد", filt: false, ui: "NONE", pos: 45 },
  { key: "layers", label: "تعداد لایه", dim: "COUNT", unit: "count", group: "ساختار", filt: true, ui: "CHECKBOX", pos: 46 },
];

/** تصویر جانشین هر خانواده — تولیدشده با scripts/generate-placeholders.mjs */
const PLACEHOLDER_BY_FAMILY = {
  vertical: "/images/products/tank-vertical.svg",
  horizontal: "/images/products/tank-horizontal.svg",
  booklike: "/images/products/tank-booklike.svg",
  spherical: "/images/products/tank-spherical.svg",
  cubic: "/images/products/tank-cubic.svg",
  underthestairs: "/images/products/tank-underthestairs.svg",
};

const DIM_LABEL = {
  height: "ارتفاع",
  length: "طول",
  width: "عرض",
  diameter: "قطر",
  lid_diameter: "قطر درب",
  hatch_diameter: "قطر دریچه",
  lid_diameter_2: "قطر درب دوم",
  hatch_diameter_2: "قطر دریچه دوم",
};

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (n) => String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
const LAYER_WORD = { 1: "تک", 2: "دو", 3: "سه" };

/** slug پایدار و قابل پیش‌بینی، مشتق از خانواده + ظرفیت + نوع مدل */
function slugify(p) {
  const cap = p.capacityL ?? "x";
  let variant = "";
  if (/بلند/.test(p.name)) variant = "-tall";
  else if (/کوتاه/.test(p.name)) variant = "-short";
  else if (/دو\s*درب/.test(p.name)) variant = "-2lid";
  else if (/استوانه/.test(p.name)) variant = "-cyl";
  return "tank-" + p.family + "-" + cap + "l" + variant;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const stat = {
  unitsAdded: 0,
  specDefsAdded: 0,
  categoriesAdded: 0,
  categorySpecLinks: 0,
  productsInserted: 0,
  productsUpdated: 0,
  specRows: 0,
  imageRows: 0,
  skipped: [],
  slugCollisions: [],
};

try {
  await q("BEGIN");

  /* 1 ── واحد سانتی‌متر (پایه طول = متر) */
  let cm = (await q("select id from units where code = 'cm'"))[0];
  if (!cm) {
    cm = (
      await q(
        "insert into units (code, label, dimension, to_base_factor, is_base, position)" +
          " values ('cm', 'سانتی‌متر', 'LENGTH', 0.01, false, 25) returning id",
      )
    )[0];
    stat.unitsAdded++;
  }
  const unitBy = Object.fromEntries(
    (await q("select id, code, to_base_factor from units")).map((u) => [u.code, u]),
  );

  /* 2 ── تعریف مشخصه‌های تازه */
  for (const d of SPEC_DEFS) {
    const exists = (await q("select id from spec_definitions where key = $1", [d.key]))[0];
    if (exists) continue;
    await q(
      "insert into spec_definitions" +
        " (key, label, data_type, dimension, default_unit_id, group_name, is_filterable, filter_ui, is_active, position)" +
        " values ($1, $2, 'NUMBER', $3, $4, $5, $6, $7, true, $8)",
      [d.key, d.label, d.dim, unitBy[d.unit].id, d.group, d.filt, d.ui, d.pos],
    );
    stat.specDefsAdded++;
  }
  const defBy = Object.fromEntries(
    (await q("select id, key from spec_definitions")).map((d) => [d.key, d]),
  );

  /* 3 ── شش دسته زیر «مخازن و منابع» موجود — دسته تازه در ریشه ساخته نمی‌شود */
  const parent = (await q("select id from categories where slug = 'tanks'"))[0];
  if (!parent) throw new Error("parent category 'tanks' not found — aborting");

  const catBy = {};
  for (const f of FAMILIES) {
    let row = (await q("select id from categories where slug = $1", [f.slug]))[0];
    if (!row) {
      row = (
        await q(
          "insert into categories (name, slug, parent_id, icon, position, is_active, is_featured, description)" +
            " values ($1, $2, $3, 'tank', $4, true, false, $5) returning id",
          [f.name, f.slug, parent.id, f.position, f.name + " پلی‌اتیلن در ظرفیت‌های مختلف."],
        )
      )[0];
      stat.categoriesAdded++;
    }
    catBy[f.src] = row.id;
  }

  /* 4 ── فیلترهای وابسته به دسته */
  const FILTER_KEYS = {
    vertical: ["volume", "height", "diameter", "layers"],
    spherical: ["volume", "height", "diameter", "layers"],
    horizontal: ["volume", "length", "width", "height", "layers"],
    booklike: ["volume", "length", "width", "height", "layers"],
    cubic: ["volume", "length", "width", "height", "layers"],
    underthestairs: ["volume", "length", "width", "height", "layers"],
  };
  for (const [fam, keys] of Object.entries(FILTER_KEYS)) {
    for (const [i, key] of keys.entries()) {
      if (!defBy[key]) continue;
      const inserted = await q(
        "insert into category_specs (category_id, definition_id, is_filterable, is_key, position)" +
          " values ($1, $2, true, $3, $4) on conflict (category_id, definition_id) do nothing returning id",
        [catBy[fam], defBy[key].id, i < 2, i],
      );
      if (inserted.length) stat.categorySpecLinks++;
    }
  }

  /* 5 ── محصولات */
  const products = JSON.parse(readFileSync(DATA, "utf8"));
  const used = new Set();

  for (const p of products) {
    if (!p.capacityL) {
      stat.skipped.push([p.name, "capacity not stated in source"]);
      continue;
    }

    let slug = slugify(p);
    if (used.has(slug)) {
      const original = slug;
      let n = 2;
      while (used.has(slug + "-v" + n)) n++;
      slug = slug + "-v" + n;
      stat.slugCollisions.push([original, slug, p.name]);
    }
    used.add(slug);

    const capFa = faNum(p.capacityL);
    const head = p.familyFa === "زیرپله" ? "مخزن زیرپله" : "مخزن " + p.familyFa;
    const shortDescription =
      head +
      " پلی‌اتیلن با ظرفیت " +
      capFa +
      " لیتر" +
      (p.layers ? "، " + (LAYER_WORD[p.layers] ?? faNum(p.layers)) + " لایه" : "") +
      ".";

    const existing = (await q("select id from products where slug = $1", [slug]))[0];
    let productId;

    if (existing) {
      productId = existing.id;
      // فقط فیلدهای مشتق از منبع؛ قیمت/وضعیت/فیلدهای مدیریتی دست نمی‌خورند
      await q(
        "update products set name = $2, short_description = $3, category_id = $4," +
          " sku = coalesce(sku, $5), updated_at = now() where id = $1",
        [productId, p.name, shortDescription, catBy[p.family], p.code],
      );
      stat.productsUpdated++;
    } else {
      productId = (
        await q(
          "insert into products" +
            " (name, slug, sku, short_description, category_id, status, price_mode, price," +
            "  unit, stock_status, min_order_qty, position, published_at, meta_title, meta_description)" +
            " values ($1, $2, $3, $4, $5, 'PUBLISHED', 'ON_REQUEST', null," +
            "  'دستگاه', 'ORDER_ONLY', 1, $6, now(), $7, $8) returning id",
          [p.name, slug, p.code, shortDescription, catBy[p.family], p.capacityL, p.name, shortDescription],
        )
      )[0].id;
      stat.productsInserted++;
    }

    /* مشخصات — کامل بازسازی می‌شود تا اجرای دوباره ردیف تکراری نسازد */
    await q("delete from product_specs where product_id = $1", [productId]);
    let pos = 0;

    const addNumeric = async (defKey, label, group, value, unitCode, isKey) => {
      const unit = unitBy[unitCode];
      const displayUnit = unitCode === "cm" ? "سانتی‌متر" : unitCode === "l" ? "لیتر" : null;
      await q(
        "insert into product_specs" +
          " (product_id, definition_id, group_name, label, value, unit, value_num, unit_id, value_base, position, is_key)" +
          " values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [
          productId,
          defBy[defKey]?.id ?? null,
          group,
          label,
          faNum(value),
          displayUnit,
          value,
          unit?.id ?? null,
          unit ? Number(value) * Number(unit.to_base_factor) : null,
          pos++,
          Boolean(isKey),
        ],
      );
      stat.specRows++;
    };

    await addNumeric("volume", "حجم", "مشخصات عمومی", p.capacityL, "l", true);

    for (const [rawKey, value] of Object.entries(p.dims)) {
      const baseKey = rawKey.replace(/_2$/, "");
      await addNumeric(
        defBy[baseKey] ? baseKey : null,
        DIM_LABEL[rawKey] ?? baseKey,
        "ابعاد",
        value,
        "cm",
        ["height", "diameter", "length"].includes(rawKey),
      );
    }

    if (p.layers) await addNumeric("layers", "تعداد لایه", "ساختار", p.layers, "count", false);

    if (p.material) {
      await q(
        "insert into product_specs" +
          " (product_id, definition_id, group_name, label, value, value_text, position, is_key)" +
          " values ($1, $2, 'ساختار', 'جنس بدنه', $3, $3, $4, false)",
        [productId, defBy["body_material"]?.id ?? null, p.material, pos++],
      );
      stat.specRows++;
    }

    /*
     * تصاویر — تصویر جانشین «نقشه فنی» خانواده، نه عکس منبع.
     *
     * عکس‌های منبع واترمارک شرکت دیگری داشتند و قابل انتشار نبودند؛ حذف شدند.
     * این اسکریپت عمداً دیگر سراغ عکس منبع نمی‌رود تا اجرای دوباره‌اش
     * ارجاع‌های حذف‌شده را برنگرداند. با رسیدن عکس واقعی محصولات، تصاویر از
     * پنل مدیریت جایگزین می‌شوند.
     */
    await q("delete from product_images where product_id = $1", [productId]);
    await q(
      "insert into product_images (product_id, url, alt, position, is_primary) values ($1, $2, $3, 0, true)",
      [productId, PLACEHOLDER_BY_FAMILY[p.family] ?? "/images/products/generic.svg", p.name],
    );
    stat.imageRows++;
  }

  if (DRY) {
    await q("ROLLBACK");
    console.log("DRY RUN — everything rolled back, database unchanged");
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
