/**
 * =============================================================================
 *  انتشار محصولات پیش‌نویس
 * =============================================================================
 *  واردکننده‌ها محصول را با وضعیت DRAFT می‌گذارند تا انتشار تصمیم انسان بماند.
 *  این اسکریپت همان تصمیم را اجرا می‌کند.
 *
 *  برخلاف اسکریپت‌های داده‌ای، این یکی از guard-destructive عبور نمی‌کند —
 *  چون اجرایش روی production کارِ عادی است، مثل db:migrate و bootstrap:admin.
 *  به‌جای آن، پیش‌فرض روی «آزمایشی» است: بدون --apply هیچ چیزی نوشته نمی‌شود.
 *
 *  اجرا:
 *      node scripts/publish-products.mjs                    # پیش‌نمایش همه
 *      node scripts/publish-products.mjs --apply            # انتشار همه
 *
 *  صافی‌ها — می‌توانید موجی منتشر کنید به‌جای یک‌باره:
 *      --category=fire-extinguishers   فقط یک دسته (نامک دسته یا والدش)
 *      --brand=راین                     فقط یک برند
 *      --min-specs=1                   فقط محصولی که دست‌کم N مشخصه دارد
 *      --with-price                    فقط محصولی که قیمت عمومی دارد
 *      --with-photo                    فقط محصولی که عکس واقعی دارد، نه طرح
 *      --with-description              فقط محصولی که توضیح دارد
 *      --published-since=<زمان>        فقط محصولی که از این زمان به بعد منتشر شده
 *      --limit=50                      حداکثر این تعداد
 *
 *  بازگرداندن — هر انتشاری قابل برگشت است:
 *      node scripts/publish-products.mjs --unpublish --category=… --apply
 * =============================================================================
 */
import "dotenv/config";

import { Client } from "pg";

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const val = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);

const APPLY = has("apply");
const UNDO = has("unpublish");
const LIMIT = Number(val("limit") ?? 0);
const MIN_SPECS = Number(val("min-specs") ?? 0);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

/* شرط‌ها به‌صورت پارامتری ساخته می‌شوند؛ هیچ ورودی‌ای داخل SQL الحاق نمی‌شود */
const where = [UNDO ? "p.status = 'PUBLISHED'" : "p.status = 'DRAFT'"];
const params = [];
const push = (sql, v) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };

if (val("category")) {
  // نامک می‌تواند خودِ دسته باشد یا والدش، تا «--category=tanks» همهٔ
  // زیرشاخه‌ها را هم بگیرد. هر دو طرف به یک پارامتر اشاره می‌کنند.
  params.push(val("category"));
  where.push(`(c.slug = $${params.length} or pc.slug = $${params.length})`);
}
if (val("brand")) push("b.name = ?", val("brand"));
// مرز زمانی — بازگرداندنِ دقیقاً یک اجرا به این تکیه می‌کند
if (val("published-since")) push("p.published_at >= ?::timestamptz", val("published-since"));
if (has("with-price")) where.push("p.price_mode = 'PUBLIC' and p.price is not null");
if (has("with-description")) where.push("coalesce(p.description, '') <> ''");
if (has("with-photo")) {
  where.push(`exists (select 1 from product_images i where i.product_id = p.id
              and (i.storage_key is not null or i.url like '/images/products/catalog/%'))`);
}
if (MIN_SPECS > 0) {
  params.push(MIN_SPECS);
  where.push(`(select count(*) from product_specs s where s.product_id = p.id) >= $${params.length}`);
}

const base = `
  from products p
  join categories c on c.id = p.category_id
  left join categories pc on pc.id = c.parent_id
  left join brands b on b.id = p.brand_id
  where ${where.join(" and ")}`;

const rows = await q(
  `select p.id, p.name, c.name as cat, coalesce(b.name, '') as brand,
          p.price_mode, p.price,
          (select count(*) from product_specs s where s.product_id = p.id) as specs,
          coalesce(length(p.description), 0) as dlen,
          exists (select 1 from product_images i where i.product_id = p.id
                  and (i.storage_key is not null
                       or i.url like '/images/products/catalog/%')) as photo
   ${base} order by c.name, p.name ${LIMIT > 0 ? `limit ${Number(LIMIT)}` : ""}`,
  params,
);

const verb = UNDO ? "بازگرداندن به پیش‌نویس" : "انتشار";

if (rows.length === 0) {
  console.log(`\n  هیچ محصولی با این شرط‌ها برای ${verb} پیدا نشد.\n`);
  await client.end();
  process.exit(0);
}

/* گزارش کیفیت — پیش از نوشتن، نه بعدش */
const n = (f) => rows.filter(f).length;
const line = (k, v) => console.log(`  ${k.padEnd(32, "·")} ${v}`);
console.log(`\n${APPLY ? `── ${verb} ──` : `── پیش‌نمایش ${verb} (چیزی نوشته نشد) ──`}\n`);
line("محصول انتخاب‌شده", rows.length);
if (!UNDO) {
  line("بدون هیچ مشخصهٔ فنی", n((r) => Number(r.specs) === 0));
  line("بدون توضیح", n((r) => Number(r.dlen) === 0));
  line("بدون برند", n((r) => !r.brand));
  line("قیمت استعلام", n((r) => r.price_mode !== "PUBLIC"));
  line("با عکس واقعی", n((r) => r.photo));
  line("فقط طرح", n((r) => !r.photo));
}

const byCat = {};
for (const r of rows) byCat[r.cat] = (byCat[r.cat] ?? 0) + 1;
console.log("\n  به تفکیک دسته:");
for (const [c, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`     ${String(v).padStart(4)}  ${c}`);
}
if (Object.keys(byCat).length > 12) {
  console.log(`     … و ${Object.keys(byCat).length - 12} دستهٔ دیگر`);
}

if (!APPLY) {
  console.log(`\n  برای اجرای واقعی، همین دستور را با --apply تکرار کنید.\n`);
  await client.end();
  process.exit(0);
}

const ids = rows.map((r) => r.id);
try {
  await q("BEGIN");
  /*
   * لحظهٔ تراکنش از خود پایگاه داده گرفته می‌شود، نه از ساعت Node. مقدار
   * published_at که پایین‌تر با now() نوشته می‌شود دقیقاً همین است، پس
   * دستور بازگردانی که در انتها چاپ می‌کنیم عیناً همین ردیف‌ها را می‌گیرد
   * و نه یکی بیشتر.
   */
  const [{ now: runAt }] = await q("select now() as now");
  const updated = await q(
    UNDO
      ? `update products set status = 'DRAFT', updated_at = now()
         where id = any($1::uuid[]) returning id`
      : /* published_at فقط بار نخست تنظیم می‌شود تا تاریخ اصلی انتشار حفظ بماند */
        `update products set status = 'PUBLISHED',
                             published_at = coalesce(published_at, now()),
                             updated_at = now()
         where id = any($1::uuid[]) returning id`,
    [ids],
  );
  await q(
    "insert into activity_logs (action, entity, summary, meta) values ($1,'product',$2,$3)",
    [
      UNDO ? "update" : "publish",
      `${verb} ${updated.length} محصول`,
      JSON.stringify({
        count: updated.length,
        filters: argv.filter((a) => a !== "--apply"),
        withoutSpecs: n((r) => Number(r.specs) === 0),
        withoutDescription: n((r) => Number(r.dlen) === 0),
        withPhoto: n((r) => r.photo),
      }),
    ],
  );
  await q("COMMIT");
  console.log(`\n  ✓ ${verb} شد: ${updated.length} محصول`);
  /*
   * صافی زمانی همیشه در دستور بازگردانی می‌آید. بدون آن، یک اجرای بدون صافی
   * دستوری چاپ می‌کرد که هر محصول منتشرشده‌ای را برمی‌گرداند — از جمله
   * محصولاتی که پیش از این اجرا منتشر بودند و ربطی به آن نداشتند.
   */
  const flags = argv.filter((a) => a !== "--apply" && a !== "--unpublish");
  console.log(`\n  برای بازگرداندن همین‌ها:`);
  if (UNDO) {
    /*
     * بازگرداندن نمی‌کند published_at را پاک کند، پس اگر این اجرا خودش صافی
     * زمانی داشته، همان صافی برای انتشار دوبارهٔ دقیقاً همین ردیف‌ها کافی است.
     */
    console.log(`     node scripts/publish-products.mjs ${flags.join(" ")} --apply\n`);
  } else {
    const rest = flags.filter((a) => !a.startsWith("--published-since="));
    console.log(
      `     node scripts/publish-products.mjs --unpublish` +
        ` --published-since=${runAt.toISOString()}` +
        `${rest.length ? " " + rest.join(" ") : ""} --apply\n`,
    );
  }
} catch (error) {
  await q("ROLLBACK");
  console.error("\n✖ خطا — هیچ تغییری اعمال نشد:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
