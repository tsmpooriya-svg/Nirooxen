/**
 * =============================================================================
 *  نوشتن توضیح برای محصولاتی که ندارند
 * =============================================================================
 *  ۳۷۸ محصول کاتالوگ هیچ توضیحی ندارند. صفحه‌شان لاغر است و در نتایج جست‌وجو
 *  چیزی برای نشان دادن ندارد.
 *
 *  قاعدهٔ این اسکریپت: **هیچ حرف تازه‌ای زده نمی‌شود.** جمله فقط از داده‌ای
 *  ساخته می‌شود که همین حالا در همان ردیف هست — دستهٔ محصول، برند، مدل، و
 *  مشخصات فنیِ ثبت‌شده با واحدشان. نه کاربرد حدس زده می‌شود، نه کیفیت ادعا
 *  می‌شود، نه صفتی اضافه می‌شود که منبعی نداشته باشد.
 *
 *  محصولی که هیچ مشخصهٔ فنی ندارد رد می‌شود: برایش جمله‌ای جز تکرار نامش
 *  نمی‌شود ساخت، و تکرار نام، توضیح نیست.
 *
 *  اجرا:
 *      node scripts/backfill-descriptions.mjs                 # پیش‌نمایش
 *      node scripts/backfill-descriptions.mjs --limit=20      # فقط ۲۰ نمونه
 *      node scripts/backfill-descriptions.mjs --category=…    # یک دسته
 *      node scripts/backfill-descriptions.mjs --apply         # نوشتن
 * =============================================================================
 */
import "dotenv/config";

import { Client } from "pg";

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const val = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);

const APPLY = has("apply");
const LIMIT = Number(val("limit") ?? 0);
const CATEGORY = val("category");
/** بیش از این تعداد مشخصه در یک جمله، جمله را به فهرست تبدیل می‌کند */
const MAX_SPECS = 3;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const params = [];
const where = ["coalesce(p.description, '') = ''"];
if (CATEGORY) {
  params.push(CATEGORY);
  where.push(`(c.slug = $${params.length} or pc.slug = $${params.length})`);
}

const rows = await q(
  `select p.id, p.name, p.model, c.name as category, coalesce(b.name, '') as brand
     from products p
     join categories c on c.id = p.category_id
     left join categories pc on pc.id = c.parent_id
     left join brands b on b.id = p.brand_id
    where ${where.join(" and ")}
    order by c.name, p.name
    ${LIMIT > 0 ? `limit ${Number(LIMIT)}` : ""}`,
  params,
);

const specs = await q(
  `select s.product_id, s.label, s.value, coalesce(u.symbol, u.label, s.unit) as unit, s.is_key, s.position
     from product_specs s
     left join units u on u.id = s.unit_id
    where s.product_id = any($1::uuid[])
    order by s.is_key desc, s.position asc`,
  [rows.map((r) => r.id)],
);

const byProduct = new Map();
for (const s of specs) {
  if (!byProduct.has(s.product_id)) byProduct.set(s.product_id, []);
  byProduct.get(s.product_id).push(s);
}

/** ارقام مقادیر در کاتالوگ‌ها گاهی لاتین ثبت شده‌اند؛ در یک جملهٔ فارسی نباید قاطی شوند */
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFaDigits = (text) => text.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);

/**
 * مشخصه‌های بله/خیر جملهٔ «با …» را می‌شکنند: «با فلوتر دارد» فارسی نیست.
 * این‌ها جدا و با «دارای …» و «بدون …» نوشته می‌شوند.
 */
const YES = new Set(["دارد", "بله"]);
const NO = new Set(["ندارد", "خیر"]);

/**
 * «حداکثر آبدهی ۶۰ لیتر بر دقیقه» — برچسب، مقدار، واحد؛ همان‌طور که در جدول
 * مشخصات همان صفحه نوشته شده، فقط پشت سر هم.
 */
function phrase(spec) {
  const value = String(spec.value ?? "").trim();
  if (!value) return null;
  if (YES.has(value)) return { kind: "flag", text: `دارای ${spec.label.trim()}` };
  if (NO.has(value)) return { kind: "flag", text: `بدون ${spec.label.trim()}` };
  const unit = (spec.unit ?? "").trim();
  return { kind: "measure", text: toFaDigits(`${spec.label.trim()} ${value}${unit ? ` ${unit}` : ""}`) };
}

/** «الف، ب و ج» */
const joinFa = (list) =>
  list.length === 1 ? list[0] : `${list.slice(0, -1).join("، ")} و ${list[list.length - 1]}`;

function describe(row) {
  const list = (byProduct.get(row.id) ?? []).map(phrase).filter(Boolean).slice(0, MAX_SPECS);
  if (list.length === 0) return null; // چیزی برای گفتن نیست

  /*
    جمله باید چیزی به نام محصول اضافه کند. «منبع ۵۰ لیتری» که توضیحش بشود
    «منبع تحت فشار، با حجم ۵۰ لیتر» فقط نامِ خودش را تکرار کرده است — چنین
    متنی نه به خریدار کمک می‌کند نه به موتور جست‌وجو، و صفحه را شلوغ‌تر
    می‌کند. پس یا دست‌کم دو مشخصه لازم است، یا برند/مدلی که در نام نیامده.
  */
  const nameHasBrand = row.brand && row.name.includes(row.brand.trim());
  const nameHasModel = row.model && row.name.includes(row.model.trim());
  const addsIdentity = (row.brand && !nameHasBrand) || (row.model && !nameHasModel);
  if (list.length < 2 && !addsIdentity) return null;

  // سرِ جمله: دسته، و اگر هست برند و مدل
  const head = [row.category.trim(), row.brand.trim(), row.model ? `مدل ${row.model.trim()}` : ""]
    .filter(Boolean)
    .join(" ");

  const measures = list.filter((x) => x.kind === "measure").map((x) => x.text);
  const flags = list.filter((x) => x.kind === "flag").map((x) => x.text);

  const parts = [];
  if (measures.length) parts.push(`با ${joinFa(measures)}`);
  if (flags.length) parts.push(joinFa(flags));

  return `${head}، ${parts.join("، ")}.`;
}

const planned = [];
const skipped = [];
for (const row of rows) {
  const text = describe(row);
  if (text) planned.push({ id: row.id, name: row.name, text });
  else skipped.push(row.name);
}

console.log(`\n── ${APPLY ? "نوشتن توضیح" : "پیش‌نمایش (چیزی نوشته نشد)"} ──\n`);
console.log(`  محصول بدون توضیح················ ${rows.length}`);
console.log(`  قابل نوشتن······················ ${planned.length}`);
console.log(`  رد شد (بی‌مشخصه یا تکرار نام)···· ${skipped.length}\n`);

for (const p of planned) {
  console.log(`  ▸ ${p.name}`);
  console.log(`    ${p.text}\n`);
}

if (!APPLY) {
  console.log(`  برای نوشتن، همین دستور را با --apply تکرار کنید.\n`);
  await client.end();
  process.exit(0);
}

try {
  await q("BEGIN");
  for (const p of planned) {
    await q("update products set description = $1, updated_at = now() where id = $2 and coalesce(description,'') = ''",
      [p.text, p.id]);
  }
  await q(
    "insert into activity_logs (action, entity, summary, meta) values ('update','product',$1,$2)",
    [`نوشتن توضیح برای ${planned.length} محصول`,
     JSON.stringify({ written: planned.length, skippedWithoutSpecs: skipped.length, filters: argv.filter((a) => a !== "--apply") })],
  );
  await q("COMMIT");
  console.log(`\n  ✓ توضیح ${planned.length} محصول نوشته شد\n`);
} catch (error) {
  await q("ROLLBACK");
  console.error("\n✖ خطا — هیچ تغییری اعمال نشد:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
