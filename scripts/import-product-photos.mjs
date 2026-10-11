/**
 * =============================================================================
 *  پیوست عکس واقعی محصولات به‌صورت دسته‌ای
 * =============================================================================
 *  وقتی عکس‌ها را از سازنده، تأمین‌کننده یا دوربین خودتان گرفتید، این اسکریپت
 *  آن‌ها را همان‌طور که پنل مدیریت آپلود می‌کند وارد می‌کند: نسخهٔ تحویلی webp
 *  با عرض ۱۶۰۰، نسخهٔ اصلی دست‌نخورده، و همان چیدمان کلید ذخیره‌سازی.
 *
 *  ورودی — یک پوشه که نام هر فایل، نامک محصول است:
 *      photos/extinguisher-co2-6kg.jpg
 *      photos/extinguisher-co2-6kg-2.jpg     ← عکس دوم همان محصول
 *      photos/fire-hose-canvas-2in.png
 *
 *  پسوند «-۲»، «-۳» … عکس‌های بعدی همان محصول‌اند؛ عکس بدون شماره تصویر اصلی
 *  می‌شود. نامکی که محصول ندارد گزارش و رد می‌شود، نه اینکه حدس زده شود.
 *
 *  اجرا:
 *      MEDIA_STORAGE_ROOT=/var/lib/nirooxen-media \
 *      node scripts/import-product-photos.mjs --dir=./photos [--dry] [--replace]
 *
 *  --dry      هیچ فایلی و ردیفی نوشته نمی‌شود؛ فقط گزارش تطبیق
 *  --replace  طرح‌های جانشین همان محصول حذف می‌شوند (فقط مسیرهای
 *             /images/products/… که خود ما گذاشته‌ایم، نه آپلودهای پنل)
 * =============================================================================
 */
import "dotenv/config";

import { assertSafeTarget } from "./guard-destructive.mjs";

const DRY = process.argv.includes("--dry");
if (!DRY) assertSafeTarget("import-product-photos");

import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";
import sharp from "sharp";

/* همان ثابت‌های src/lib/media/process.ts — عکسِ واردشده باید دقیقاً مثل
   آپلود پنل باشد، وگرنه دو جور فایل در یک پوشه جمع می‌شود. */
const DISPLAY_WIDTH = 1600;
const DISPLAY_QUALITY = 82;
const MAX_INPUT_PIXELS = 40_000_000;
const MEDIA_PUBLIC_PREFIX = "/media";
const ALLOWED = { jpeg: "jpg", png: "png", webp: "webp" };

const REPLACE = process.argv.includes("--replace");
const DIR = process.argv.find((a) => a.startsWith("--dir="))?.slice(6);
if (!DIR) {
  console.error("✖ پوشهٔ عکس‌ها را بدهید:  --dir=./photos");
  process.exit(1);
}

/* ریشهٔ ذخیره‌سازی — همان قاعدهٔ src/lib/storage/index.ts */
const ROOT = process.env.MEDIA_STORAGE_ROOT?.trim()
  ? path.resolve(process.env.MEDIA_STORAGE_ROOT.trim())
  : path.join(os.tmpdir(), "nirooxen-media");

/** نام فایل → { نامک، ترتیب } */
function parseName(file) {
  const base = path.basename(file, path.extname(file));
  const m = /^(.*?)-(\d+)$/.exec(base);
  if (m && Number(m[2]) > 1) return { slug: m[1], position: Number(m[2]) - 1 };
  return { slug: base, position: 0 };
}

async function processImage(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!ALLOWED[meta.format]) throw new Error(`قالب ${meta.format} پذیرفته نیست`);
  if (!meta.width || !meta.height) throw new Error("ابعاد تصویر خوانده نشد");
  // پیش از رمزگشایی رد می‌شود؛ همان محافظت در برابر «بمب فشرده‌سازی»
  if (meta.width * meta.height > MAX_INPUT_PIXELS) throw new Error("ابعاد بیش از حد مجاز");

  const rendered = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: DISPLAY_WIDTH, withoutEnlargement: true })
    .webp({ quality: DISPLAY_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    original: buffer,
    originalExtension: ALLOWED[meta.format],
    display: rendered.data,
    width: rendered.info.width,
    height: rendered.info.height,
  };
}

async function put(key, data) {
  const full = path.join(ROOT, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

const files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
if (files.length === 0) {
  console.error(`✖ هیچ تصویری در ${DIR} نبود`);
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const stat = { attached: 0, replaced: 0, noProduct: [], failed: [] };

try {
  await q("BEGIN");

  for (const file of files) {
    const { slug, position } = parseName(file);
    const product = (await q("select id, name from products where slug = $1", [slug]))[0];
    if (!product) { stat.noProduct.push(file); continue; }

    let img;
    try {
      img = await processImage(await readFile(path.join(DIR, file)));
    } catch (e) { stat.failed.push([file, e.message]); continue; }

    const assetId = randomUUID();
    const prefix = `products/${product.id}/${assetId}`;
    const displayKey = `${prefix}/detail.webp`;
    const originalKey = `${prefix}/original.${img.originalExtension}`;

    if (!DRY) {
      await put(displayKey, img.display);
      await put(originalKey, img.original);
    }

    /*
     * فقط طرح‌های جانشینِ خودمان حذف می‌شوند. عکسی که اپراتور از پنل بالا برده
     * storage_key دارد و دست نمی‌خورد — وگرنه یک اجرای دسته‌ای کار دستی او را
     * پاک می‌کرد.
     */
    if (REPLACE && position === 0) {
      const gone = await q(
        "delete from product_images where product_id = $1 and storage_key is null" +
          " and url like '/images/products/%' returning id",
        [product.id],
      );
      stat.replaced += gone.length;
    }

    await q(
      "insert into product_images" +
        " (product_id, url, storage_key, width, height, alt, position, is_primary)" +
        " values ($1,$2,$3,$4,$5,$6,$7,$8)",
      [product.id, `${MEDIA_PUBLIC_PREFIX}/${displayKey}`, prefix,
       img.width, img.height, product.name, position, position === 0],
    );
    stat.attached++;
  }

  if (DRY) await q("ROLLBACK"); else await q("COMMIT");
} catch (error) {
  await q("ROLLBACK");
  console.error("\n✖ خطا — هیچ تغییری اعمال نشد:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

const line = (k, v) => console.log(`  ${k.padEnd(30, "·")} ${v}`);
console.log(`\n${DRY ? "── اجرای آزمایشی (بدون نوشتن) ──" : "── عکس‌ها پیوست شد ──"}\n`);
line("فایل بررسی‌شده", files.length);
line("عکس پیوست‌شده", stat.attached);
if (REPLACE) line("طرح جانشین حذف‌شده", stat.replaced);
if (stat.noProduct.length) {
  console.log(`\n  ✖ محصولی با این نامک نبود (${stat.noProduct.length}):`);
  for (const f of stat.noProduct.slice(0, 10)) console.log(`     ${f}`);
  if (stat.noProduct.length > 10) console.log(`     … و ${stat.noProduct.length - 10} مورد دیگر`);
}
if (stat.failed.length) {
  console.log(`\n  ✖ پردازش ناموفق (${stat.failed.length}):`);
  for (const [f, why] of stat.failed.slice(0, 10)) console.log(`     ${f} — ${why}`);
}
console.log("");
