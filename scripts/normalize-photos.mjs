/**
 * =============================================================================
 *  یکدست‌سازی عکس محصولات
 * =============================================================================
 *  چیزی که یک سایت را ارزان نشان می‌دهد، کیفیت پایین عکس نیست — ناهماهنگی است:
 *  یک عکس با پس‌زمینهٔ سفید کنار یکی با پس‌زمینهٔ خاکستری کنار یکی کج و بی‌حاشیه.
 *
 *  این اسکریپت هر عکسی از هر منبعی را به یک قالب واحد می‌آورد:
 *    ۱. پس‌زمینهٔ روشنِ نایکنواخت (ملافه، مقوا، دیوار) سفید می‌شود
 *    ۲. حاشیهٔ خالی دور محصول بریده می‌شود تا کالا در همهٔ کارت‌ها هم‌اندازه بنشیند
 *    ۳. نتیجه در بومِ مربعِ سفید با حاشیهٔ یکسان می‌نشیند
 *    ۴. خروجی webp با اندازهٔ ثابت
 *
 *  عکس موبایلِ روی مقوای سفید و عکس کاتالوگ سازنده، بعد از این، کنار هم یک
 *  مجموعه به نظر می‌رسند.
 *
 *  اجرا:
 *      node scripts/normalize-photos.mjs --in=./raw --out=./photos
 *      [--size=1200]     بُعد بوم مربع (پیش‌فرض ۱۲۰۰)
 *      [--pad=8]         حاشیهٔ اطراف محصول به درصد (پیش‌فرض ۸)
 *      [--white=242]     آستانهٔ روشنایی که پس‌زمینه شمرده می‌شود (۰ تا ۲۵۵)
 *      [--no-white]      پس‌زمینه را سفید نکن، فقط برش و مربع کن
 *      [--quality=86]
 *
 *  نام فایل دست‌نخورده می‌ماند، چون همان نامک محصول است.
 * =============================================================================
 */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const IN = arg("in");
const OUT = arg("out", "./photos-normalized");
const SIZE = Number(arg("size", 1200));
const PAD = Number(arg("pad", 8));
const WHITE = Number(arg("white", 242));
const QUALITY = Number(arg("quality", 86));
const NO_WHITE = process.argv.includes("--no-white");

if (!IN) {
  console.error("✖ پوشهٔ ورودی را بدهید:  --in=./raw");
  process.exit(1);
}

/**
 * پس‌زمینه را سفید می‌کند.
 *
 * روش عمداً ساده است و مدل یادگیری نمی‌خواهد: هر پیکسلی که هم روشن است و هم
 * بی‌رنگ (اختلاف کانال‌هایش کم است) پس‌زمینه شمرده می‌شود. این برای عکسِ روی
 * مقوا یا ملافهٔ سفید خوب کار می‌کند و — مهم‌تر — به محصولِ روشن دست نمی‌زند،
 * چون فلز و پلاستیک رنگی، اختلاف کانال دارند.
 *
 * برای عکس روی پس‌زمینهٔ شلوغ یا رنگی کار نمی‌کند؛ آنجا --no-white بدهید.
 */
async function whiten(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  let touched = 0;
  for (let i = 0; i < px; i++) {
    const o = i * info.channels;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (min >= WHITE && max - min <= 14) {
      data[o] = data[o + 1] = data[o + 2] = 255;
      touched++;
    }
  }
  return {
    buf: await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .png().toBuffer(),
    ratio: touched / px,
  };
}

const files = (await readdir(IN)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
if (!files.length) {
  console.error(`✖ هیچ تصویری در ${IN} نبود`);
  process.exit(1);
}
await mkdir(OUT, { recursive: true });

const inner = Math.round(SIZE * (1 - PAD / 50));
let ok = 0;
const failed = [];
const notes = [];

for (const f of files) {
  const src = path.join(IN, f);
  try {
    let img = sharp(src).rotate();               // جهت EXIF را اعمال کن
    let buf = await img.toBuffer();
    const before = await sharp(buf).metadata();

    if (!NO_WHITE) {
      const w = await whiten(buf);
      buf = w.buf;
      // اگر تقریباً هیچ پیکسلی سفید نشد، پس‌زمینه روشن نبوده — هشدار بده
      if (w.ratio < 0.02) notes.push([f, "پس‌زمینه روشن نبود؛ سفیدسازی اثری نداشت"]);
    }

    // برش حاشیهٔ سفید، بعد جا دادن در بوم مربع با حاشیهٔ یکسان
    const out = await sharp(buf)
      .trim({ background: "#ffffff", threshold: 12 })
      .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
      .extend({
        top: 0, bottom: 0, left: 0, right: 0,
        background: "#ffffff",
      })
      .flatten({ background: "#ffffff" })
      .resize(SIZE, SIZE, { fit: "contain", background: "#ffffff" })
      .webp({ quality: QUALITY })
      .toBuffer();

    const name = path.basename(f, path.extname(f)) + ".webp";
    await sharp(out).toFile(path.join(OUT, name));
    ok++;
    process.stdout.write(`\r  پردازش ${ok}/${files.length} …`);
    void before;
  } catch (e) {
    failed.push([f, e.message.slice(0, 60)]);
  }
}

console.log(`\r  یکدست‌شده${"·".repeat(20)} ${ok} از ${files.length}        `);
console.log(`  اندازه${"·".repeat(23)} ${SIZE}×${SIZE} webp`);
if (notes.length) {
  console.log(`\n  ⚠ هشدار (${notes.length}):`);
  for (const [f, why] of notes.slice(0, 10)) console.log(`     ${f} — ${why}`);
  if (notes.length > 10) console.log(`     … و ${notes.length - 10} مورد دیگر`);
}
if (failed.length) {
  console.log(`\n  ✖ ناموفق (${failed.length}):`);
  for (const [f, why] of failed.slice(0, 10)) console.log(`     ${f} — ${why}`);
}
if (ok) {
  console.log("\n  گام بعد:");
  console.log(`     node scripts/import-product-photos.mjs --dir=${OUT} --dry`);
}
console.log("");
