/**
 * =============================================================================
 *  Backfill مشخصات فنی نوع‌دار
 * =============================================================================
 *  ۱. واحدها و تعریف مشخصات را از src/db/spec-catalog.ts می‌سازد (idempotent)
 *  ۲. تعریف‌ها را به دسته‌بندی‌ها وصل می‌کند
 *  ۳. ردیف‌های موجود product_specs را به تعریف مربوطه نگاشت و مقدار نوع‌دار
 *     آن‌ها را استخراج می‌کند
 *
 *  اصول:
 *   • ستون‌های قدیمی (label/value/unit) هرگز پاک نمی‌شوند
 *   • هر ردیفی که قطعی تبدیل نشود، is_unparsed=true می‌گیرد و گزارش می‌شود
 *   • هیچ مقداری حدس زده نمی‌شود
 *   • با اجرای دوباره نتیجه تغییر نمی‌کند
 *
 *  اجرا:
 *      node scripts/backfill-specs.mjs           # اجرای واقعی
 *      node scripts/backfill-specs.mjs --dry-run # فقط گزارش، بدون نوشتن
 * =============================================================================
 */
import "dotenv/config";

import { Client } from "pg";

import { specDefinitionSeeds, unitSeeds, categorySpecSeeds } from "../src/db/spec-catalog.ts";
import { parseBooleanValue, parseNumericValue } from "../src/lib/spec-value.ts";

const DRY_RUN = process.argv.includes("--dry-run");
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const log = (...a) => console.log(...a);
log(DRY_RUN ? "🔍 حالت آزمایشی — چیزی نوشته نمی‌شود\n" : "✍️  اجرای واقعی\n");

try {
  await client.query("BEGIN");

  /* ------------------------------- ۱. واحدها ------------------------------ */
  const unitIdByCode = new Map();
  const unitByLegacy = new Map();
  const factorByCode = new Map();

  for (const [i, u] of unitSeeds.entries()) {
    const res = await client.query(
      `insert into units (code, label, symbol, dimension, to_base_factor, is_base, position)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (code) do update set
         label = excluded.label, symbol = excluded.symbol, dimension = excluded.dimension,
         to_base_factor = excluded.to_base_factor, is_base = excluded.is_base,
         position = excluded.position, updated_at = now()
       returning id`,
      [u.code, u.label, u.symbol ?? null, u.dimension, u.toBaseFactor, u.isBase ?? false, i],
    );
    const id = res.rows[0].id;
    unitIdByCode.set(u.code, id);
    factorByCode.set(u.code, Number(u.toBaseFactor));
    for (const legacy of u.legacyUnits ?? []) unitByLegacy.set(legacy.trim(), u.code);
  }
  log(`واحدها: ${unitSeeds.length} ثبت/به‌روزرسانی شد`);

  /* --------------------------- ۲. تعریف مشخصات ---------------------------- */
  const defIdByKey = new Map();
  const defByLegacyLabel = new Map();
  const defByKey = new Map();

  for (const d of specDefinitionSeeds) {
    const res = await client.query(
      `insert into spec_definitions
         (key, label, description, data_type, dimension, default_unit_id, group_name,
          is_filterable, filter_ui, position)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (key) do update set
         label = excluded.label, description = excluded.description,
         data_type = excluded.data_type, dimension = excluded.dimension,
         default_unit_id = excluded.default_unit_id, group_name = excluded.group_name,
         is_filterable = excluded.is_filterable, filter_ui = excluded.filter_ui,
         position = excluded.position, updated_at = now()
       returning id`,
      [
        d.key, d.label, d.description ?? null, d.dataType, d.dimension ?? null,
        d.defaultUnitCode ? unitIdByCode.get(d.defaultUnitCode) : null,
        d.groupName, d.isFilterable, d.filterUi, d.position,
      ],
    );
    defIdByKey.set(d.key, res.rows[0].id);
    defByKey.set(d.key, d);
    for (const label of d.legacyLabels) defByLegacyLabel.set(label.trim(), d.key);
  }
  log(`تعریف مشخصات: ${specDefinitionSeeds.length} ثبت/به‌روزرسانی شد`);

  /* ------------------------ ۳. اتصال به دسته‌بندی‌ها ----------------------- */
  const cats = await client.query("select id, slug from categories");
  const catIdBySlug = new Map(cats.rows.map((r) => [r.slug, r.id]));
  let linkCount = 0;
  const missingCats = [];

  for (const [slug, entries] of Object.entries(categorySpecSeeds)) {
    const categoryId = catIdBySlug.get(slug);
    if (!categoryId) { missingCats.push(slug); continue; }
    for (const [i, entry] of entries.entries()) {
      const definitionId = defIdByKey.get(entry.key);
      if (!definitionId) continue;
      await client.query(
        `insert into category_specs (category_id, definition_id, is_key, position)
         values ($1,$2,$3,$4)
         on conflict (category_id, definition_id) do update set
           is_key = excluded.is_key, position = excluded.position`,
        [categoryId, definitionId, entry.isKey ?? false, i],
      );
      linkCount++;
    }
  }
  log(`اتصال دسته↔مشخصه: ${linkCount} ردیف`);
  if (missingCats.length) log(`  ⚠️ دسته‌بندی یافت نشد: ${missingCats.join(", ")}`);

  /* -------------------------- ۴. نگاشت ردیف‌ها ---------------------------- */
  const specs = await client.query(
    `select ps.id, ps.label, ps.value, ps.unit, p.name as product_name, c.slug as category_slug
     from product_specs ps
     join products p on p.id = ps.product_id
     join categories c on c.id = p.category_id
     order by ps.label`,
  );

  const report = { mapped: 0, unmapped: [], unparsed: [], numeric: 0, text: 0, bool: 0, range: 0 };

  for (const row of specs.rows) {
    const defKey = defByLegacyLabel.get(row.label.trim());

    if (!defKey) {
      report.unmapped.push(`${row.label} = ${row.value} (${row.category_slug})`);
      continue;
    }

    const def = defByKey.get(defKey);
    const definitionId = defIdByKey.get(defKey);

    // واحد: از ستون قدیمی حدس زده می‌شود، وگرنه واحد پیش‌فرض تعریف
    const legacyUnitCode = row.unit ? unitByLegacy.get(row.unit.trim()) : undefined;
    const unitCode = legacyUnitCode ?? def.defaultUnitCode ?? null;
    const unitId = unitCode ? unitIdByCode.get(unitCode) : null;
    const factor = unitCode ? (factorByCode.get(unitCode) ?? 1) : 1;

    let valueText = null, valueNum = null, valueNumMax = null, valueBool = null;
    let valueBase = null, valueBaseMax = null, isUnparsed = false;

    if (def.dataType === "TEXT") {
      valueText = row.value.trim();
      report.text++;
    } else if (def.dataType === "BOOLEAN") {
      valueBool = parseBooleanValue(row.value);
      if (valueBool === null) { isUnparsed = true; report.unparsed.push(`${row.label} = ${row.value} — بولین نامشخص`); }
      else report.bool++;
    } else {
      const parsed = parseNumericValue(row.value);
      if (!parsed.ok) {
        isUnparsed = true;
        valueText = row.value.trim();
        report.unparsed.push(`${row.label} = "${row.value}" — ${parsed.reason} (${row.category_slug})`);
      } else {
        valueNum = parsed.min;
        valueNumMax = parsed.max;
        valueBase = parsed.min === null ? null : parsed.min * factor;
        valueBaseMax = parsed.max === null ? null : parsed.max * factor;
        if (parsed.kind === "range") report.range++; else report.numeric++;
      }
    }

    if (!DRY_RUN) {
      await client.query(
        `update product_specs set
           definition_id=$1, value_text=$2, value_num=$3, value_num_max=$4, value_bool=$5,
           unit_id=$6, value_base=$7, value_base_max=$8, is_unparsed=$9, group_name=$10
         where id=$11`,
        [definitionId, valueText, valueNum, valueNumMax, valueBool, unitId,
         valueBase, valueBaseMax, isUnparsed, def.groupName, row.id],
      );
    }
    report.mapped++;
  }

  /* ------------- ۵. is_key از روی اتصال دسته↔مشخصه همگام می‌شود ----------- */
  if (!DRY_RUN) {
    await client.query(`
      update product_specs ps
      set is_key = cs.is_key
      from products p
      join category_specs cs on cs.category_id = p.category_id
      where ps.product_id = p.id
        and ps.definition_id = cs.definition_id
        and cs.is_key = true
    `);
  }

  if (DRY_RUN) await client.query("ROLLBACK");
  else await client.query("COMMIT");

  /* ------------------------------- گزارش --------------------------------- */
  log(`\n${"=".repeat(70)}`);
  log(`نگاشت‌شده: ${report.mapped} از ${specs.rows.length}`);
  log(`  عدد تکی: ${report.numeric} | بازه: ${report.range} | متن: ${report.text} | بولین: ${report.bool}`);

  log(`\nبدون تعریف (${report.unmapped.length}) — با ستون‌های قدیمی نمایش داده می‌شوند:`);
  for (const u of report.unmapped) log(`  · ${u}`);

  log(`\nغیرقابل تبدیل (${report.unparsed.length}) — خام حفظ و علامت‌گذاری شد:`);
  for (const u of report.unparsed) log(`  ⚠ ${u}`);
  log("=".repeat(70));
} catch (error) {
  await client.query("ROLLBACK");
  console.error("✗ backfill ناموفق — تراکنش برگشت خورد");
  throw error;
} finally {
  await client.end();
}
