/**
 * =============================================================================
 *  چسباندن عکس خانواده به محصولات
 * =============================================================================
 *  یک عکس در پوشهٔ photos/ با نام خانواده، به همهٔ محصولات آن خانواده وصل
 *  می‌شود. همان مسیری که آپلود پنل می‌رود طی می‌شود — تغییر اندازه، برداشتن
 *  پس‌زمینه، تشخیص نوع پس‌زمینه — پس نتیجه با عکسی که دستی آپلود شده فرقی
 *  ندارد.
 *
 *  پیش‌فرض «پیش‌نمایش» است: بدون --apply هیچ فایلی نوشته و هیچ ردیفی عوض
 *  نمی‌شود. با ۸۰۰ محصول، یک اشتباه در خانواده‌بندی یعنی صدها عکس غلط، پس
 *  دیدن پیش از نوشتن اینجا اختیاری نیست.
 *
 *  اجرا:
 *      npm run photos:plan                 نقشه را بساز
 *      npm run photos:apply                پیش‌نمایش
 *      npm run photos:apply -- --apply     اعمال
 *      ... --replace                       عکس واقعیِ موجود را هم عوض کن
 *      ... --family=<key>                  فقط یک خانواده
 * =============================================================================
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";
import sharp from "sharp";

import { detectBackdrop } from "../src/lib/media/backdrop";
import { removeBackdrop } from "../src/lib/media/cutout";

/* همان مقادیر خط لولهٔ پنل. اگر آنجا عوض شد، اینجا هم باید عوض شود — عکسی که
   از این راه می‌آید نباید با عکسی که دستی آپلود شده فرق کند. */
const DISPLAY_WIDTH = 1600;
const DISPLAY_QUALITY = 82;

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const REPLACE = argv.includes("--replace");
const ONLY = argv.find((a) => a.startsWith("--family="))?.slice("--family=".length);
const PHOTOS_DIR = process.env.PHOTOS_DIR ?? "photos";

type Plan = {
  families: {
    key: string;
    label: string;
    productCount: number;
    withPhoto: number;
    productIds: string[];
  }[];
};

/** عکس خانواده روی دیسک، با هر پسوند پذیرفتنی */
function findPhoto(key: string): string | null {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const file = path.join(PHOTOS_DIR, `${key}.${ext}`);
    if (existsSync(file)) return file;
  }
  return null;
}

/*
  کلید ذخیره‌سازی عمداً اینجا دوباره ساخته می‌شود و از lib/storage وارد
  نمی‌شود: آن ماژول "server-only" است و در اسکریپت اجرا نمی‌شود. شکلش باید
  دقیقاً همان بماند، وگرنه مسیر تحویل تصویر فایل را پیدا نمی‌کند.
*/
const assetPrefix = (productId: string, assetId: string) => `products/${productId}/${assetId}`;

async function main() {
  if (!existsSync("photo-plan.json")) {
    console.error("\n✖ photo-plan.json نیست. اول npm run photos:plan را بزنید.\n");
    process.exit(1);
  }
  const plan = JSON.parse(readFileSync("photo-plan.json", "utf8")) as Plan;

  const root = process.env.MEDIA_STORAGE_ROOT?.trim();
  if (!root) {
    console.error("\n✖ MEDIA_STORAGE_ROOT تعریف نشده است.\n");
    process.exit(1);
  }

  const available = existsSync(PHOTOS_DIR)
    ? readdirSync(PHOTOS_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length
    : 0;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log(`\n${APPLY ? "── چسباندن عکس ──" : "── پیش‌نمایش (چیزی نوشته نشد) ──"}\n`);
  console.log(`  ${available} عکس در ${PHOTOS_DIR}/ · ${plan.families.length} خانواده در نقشه\n`);

  let attached = 0;
  let skipped = 0;
  let missing = 0;
  const touched: string[] = [];

  for (const family of plan.families) {
    if (ONLY && family.key !== ONLY) continue;

    const photo = findPhoto(family.key);
    if (!photo) {
      missing += family.productCount;
      continue;
    }

    /*
      عکس یک بار پردازش می‌شود و بافر نتیجه برای همهٔ محصولات خانواده به کار
      می‌رود. برداشتن پس‌زمینه گران‌ترین قدم است و انجامش به ازای هر محصول،
      همان کار را بیست بار تکرار می‌کرد.
    */
    const source = readFileSync(photo);
    const rendered = await sharp(source)
      .rotate()
      .resize({ width: DISPLAY_WIDTH, withoutEnlargement: true })
      .webp({ quality: DISPLAY_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const cut = await removeBackdrop(rendered.data, DISPLAY_QUALITY);
    const display = cut.removed ? cut.data : rendered.data;
    const backdrop = cut.removed ? "cut" : await detectBackdrop(display);

    /* کدام محصولات این خانواده هنوز عکس واقعی ندارند */
    const { rows: pending } = await client.query<{ id: string }>(
      `select p.id from products p
        where p.id = any($1::uuid[])
          ${REPLACE ? "" : `and not exists (
              select 1 from product_images i
               where i.product_id = p.id and i.url not like '%.svg')`}`,
      [family.productIds],
    );

    skipped += family.productCount - pending.length;
    if (pending.length === 0) continue;

    touched.push(
      `${String(pending.length).padStart(4)}  ${cut.removed ? "بریده" : backdrop === "light" ? "روشن " : "تیره "}  ${family.label}`,
    );
    attached += pending.length;

    if (!APPLY) continue;

    for (const product of pending) {
      const assetId = randomUUID();
      const prefix = assetPrefix(product.id, assetId);
      const dir = path.join(root, prefix);
      await mkdir(dir, { recursive: true });

      /*
        نوشتن اتمیک: اول فایل موقت، بعد جابه‌جایی. اگر اسکریپت وسط نوشتن قطع
        شود، فایل نیم‌کاره‌ای نمی‌ماند که بعداً سالم به نظر برسد.
      */
      for (const [name, data] of [
        ["detail.webp", display],
        ["original" + path.extname(photo), source],
      ] as const) {
        const target = path.join(dir, name);
        const temp = `${target}.tmp`;
        await writeFile(temp, data);
        await rename(temp, target);
      }

      await client.query("BEGIN");
      try {
        // طرح پیش‌فرض کنار می‌رود؛ عکس واقعی جایش را می‌گیرد
        await client.query(
          "delete from product_images where product_id = $1 and url like '%.svg'",
          [product.id],
        );
        await client.query(
          `insert into product_images
             (product_id, url, storage_key, width, height, alt, position, is_primary, backdrop)
           values ($1, $2, $3, $4, $5, null, 0, true, $6)`,
          [
            product.id,
            `/media/${prefix}/detail.webp`,
            prefix,
            rendered.info.width,
            rendered.info.height,
            backdrop,
          ],
        );
        // تصویر تازه اصلی است؛ بقیه باید جایگاهشان را پس بدهند
        await client.query(
          `update product_images set is_primary = false, position = position + 1
            where product_id = $1 and storage_key is distinct from $2`,
          [product.id, prefix],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  }

  if (touched.length > 0) {
    console.log("  محصول  پس‌زمینه  خانواده");
    for (const line of touched.slice(0, 40)) console.log(`  ${line}`);
    if (touched.length > 40) console.log(`  … و ${touched.length - 40} خانوادهٔ دیگر`);
    console.log("");
  }

  const line = (k: string, v: number) => console.log(`  ${k.padEnd(30, "·")} ${v}`);
  line("محصولی که عکس می‌گیرد", attached);
  line("از قبل عکس داشت", skipped);
  line("عکس خانواده‌اش موجود نیست", missing);

  if (!APPLY) {
    console.log(`\n  برای اجرای واقعی:  npm run photos:apply -- --apply\n`);
  } else {
    console.log(`\n  ✓ انجام شد. برای دیده شدن: npm run build && sudo systemctl restart nirooxen\n`);
  }

  await client.end();
}

main().catch((error) => {
  console.error("\n✖ خطا:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
