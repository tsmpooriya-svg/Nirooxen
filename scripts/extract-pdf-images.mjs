/**
 * =============================================================================
 *  بیرون کشیدن تصویرهای جاسازی‌شده از کاتالوگ PDF
 * =============================================================================
 *  کاتالوگ رسمی سازنده معمولاً عکس محصول را با کیفیت اصلی داخل خود PDF دارد.
 *  این اسکریپت آن‌ها را بدون هیچ وابستگی بیرونی بیرون می‌کشد تا بعد با
 *  import-product-photos.mjs به محصول‌ها بسته شوند.
 *
 *  سه فیلتر رایج پوشش داده می‌شود:
 *    DCTDecode   بایت‌ها خودشان JPEG کامل‌اند و مستقیم نوشته می‌شوند
 *    FlateDecode بیت‌مپ خام؛ با ابعاد و کانالِ خوانده‌شده به PNG تبدیل می‌شود
 *    JPXDecode   JPEG2000 — فقط گزارش می‌شود، چون ابزار جدا می‌خواهد
 *
 *  تصویری که /SMask دارد روی زمینهٔ سفید ترکیب می‌شود؛ بدون این کار، بخش شفافِ
 *  عکس سیاه در می‌آید و کارت محصول خراب می‌شود.
 *
 *  اجرا:
 *      node scripts/extract-pdf-images.mjs --pdf=catalog.pdf --out=./photos
 *      [--min=150]   کمینهٔ عرض و ارتفاع؛ لوگو و آیکون را کنار می‌گذارد.
 *                    اگر عکسی جا افتاد، گزارش «کوچک» اندازه‌اش را می‌گوید.
 *
 *  خروجی: فایل‌های شماره‌گذاری‌شده + sheet.jpg برای مرور سریع. نام‌گذاری به
 *  نامک محصول دستِ انسان است — این اسکریپت هرگز حدس نمی‌زند کدام عکس مال
 *  کدام کالاست.
 * =============================================================================
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import sharp from "sharp";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const PDF = arg("pdf");
const OUT = arg("out", "./photos");
const MIN = Number(arg("min", 150));

if (!PDF) {
  console.error("✖ مسیر فایل را بدهید:  --pdf=catalog.pdf");
  process.exit(1);
}

const data = await readFile(PDF);

/** همهٔ اشیای «N G obj … endobj» — کافی است، چون xref لازم نداریم */
function objects(buf) {
  const out = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  const s = buf.toString("latin1");
  let m;
  while ((m = re.exec(s))) {
    const end = s.indexOf("endobj", re.lastIndex);
    if (end < 0) continue;
    out.set(Number(m[1]), { start: re.lastIndex, end });
  }
  return out;
}

const latin = data.toString("latin1");
const objs = objects(data);

const dictOf = (o) => {
  const i = latin.indexOf("stream", o.start);
  return latin.slice(o.start, i > 0 && i < o.end ? i : o.end);
};

const rawOf = (o) => {
  const m = /stream\r?\n/.exec(latin.slice(o.start, o.end));
  if (!m) return null;
  const from = o.start + m.index + m[0].length;
  const e = latin.lastIndexOf("endstream", o.end);
  return data.subarray(from, e > from ? e : o.end);
};

const numOf = (d, key) => {
  const m = new RegExp(`/${key}\\s+(\\d+)`).exec(d);
  return m ? Number(m[1]) : null;
};

function inflate(buf) {
  try { return zlib.inflateSync(buf); } catch { /* ادامه */ }
  try { return zlib.inflateRawSync(buf); } catch { return null; }
}

/** بیت‌مپ خام → بافر sharp. کانال از طول واقعی گرفته می‌شود، نه از نام فضای رنگ. */
function rawImage(buf, w, h, dict) {
  const exact = Math.floor(buf.length / (w * h));
  const named = /\/DeviceRGB/.test(dict) ? 3 : /\/DeviceGray/.test(dict) ? 1
    : /\/DeviceCMYK/.test(dict) ? 4 : null;
  const ch = [1, 3, 4].includes(exact) && buf.length >= w * h * exact ? exact
    : named && buf.length >= w * h * named ? named : null;
  if (!ch) return null;
  return sharp(buf.subarray(0, w * h * ch), { raw: { width: w, height: h, channels: ch } });
}

await mkdir(OUT, { recursive: true });

const found = [];
const skipped = [];
const masks = new Map();   // شمارهٔ شیء ماسک → { buf, w, h }

/* گذر یکم: هر تصویر را بخوان و نگه دار (ماسک‌ها هم خودشان تصویرند) */
const images = new Map();
for (const [n, o] of objs) {
  const d = dictOf(o);
  if (!/\/Subtype\s*\/Image/.test(d)) continue;
  const w = numOf(d, "Width");
  const h = numOf(d, "Height");
  const bpc = numOf(d, "BitsPerComponent") ?? 8;
  const raw = rawOf(o);
  if (!w || !h || !raw) continue;

  if (/\/JPXDecode/.test(d)) { skipped.push([n, "JPEG2000"]); continue; }

  if (/\/DCTDecode/.test(d)) {
    const s = raw.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
    const e = raw.lastIndexOf(Buffer.from([0xff, 0xd9]));
    if (s < 0 || e < 0) { skipped.push([n, "JPEG ناقص"]); continue; }
    images.set(n, { d, w, h, img: sharp(raw.subarray(s, e + 2)) });
    continue;
  }

  if (/\/FlateDecode/.test(d)) {
    const buf = inflate(raw);
    if (!buf || bpc !== 8) { skipped.push([n, `بیت‌مپ نامتعارف (bpc=${bpc})`]); continue; }
    const img = rawImage(buf, w, h, d);
    if (!img) { skipped.push([n, `کانال نامشخص (${buf.length} بایت)`]); continue; }
    images.set(n, { d, w, h, img, gray: buf.length / (w * h) === 1, buf });
    continue;
  }

  skipped.push([n, "فیلتر ناشناخته"]);
}

/* شیئی که جای دیگری به‌عنوان /SMask صدا زده شده، خودش محصول نیست */
for (const [, o] of objs) {
  for (const m of dictOf(o).matchAll(/\/SMask\s+(\d+)\s+\d+\s+R/g)) masks.set(Number(m[1]), true);
}

let i = 0;
for (const [n, it] of images) {
  if (masks.has(n)) continue;                       // ماسک است، نه عکس
  if (it.w < MIN || it.h < MIN) { skipped.push([n, `کوچک (${it.w}×${it.h})`]); continue; }

  let img = it.img;
  const sm = /\/SMask\s+(\d+)\s+\d+\s+R/.exec(it.d);
  if (sm && images.has(Number(sm[1]))) {
    const mask = images.get(Number(sm[1]));
    if (mask.buf && mask.w === it.w && mask.h === it.h) {
      // شفافیت روی سفید نشانده می‌شود، وگرنه پس‌زمینه سیاه در می‌آید
      const rgb = await img.resize(it.w, it.h).removeAlpha().toColourspace("srgb").raw().toBuffer();
      const out = Buffer.alloc(it.w * it.h * 3);
      for (let p = 0; p < it.w * it.h; p++) {
        const a = mask.buf[p] / 255;
        for (let c = 0; c < 3; c++) out[p * 3 + c] = Math.round(rgb[p * 3 + c] * a + 255 * (1 - a));
      }
      img = sharp(out, { raw: { width: it.w, height: it.h, channels: 3 } });
    }
  }

  const file = path.join(OUT, `${String(++i).padStart(3, "0")}-obj${n}.png`);
  await img.png().toFile(file);
  found.push({ file, obj: n, w: it.w, h: it.h });
}

/* برگهٔ مرور — انتخاب اینکه کدام عکس مال کدام محصول است با انسان می‌ماند */
if (found.length) {
  const CW = 200, COLS = 6;
  const rows = Math.ceil(found.length / COLS);
  const tiles = [];
  for (const [k, f] of found.entries()) {
    tiles.push({
      input: await sharp(f.file).resize(CW, CW, { fit: "contain", background: "#fff" }).png().toBuffer(),
      left: (k % COLS) * CW, top: Math.floor(k / COLS) * CW,
    });
  }
  await sharp({ create: { width: COLS * CW, height: rows * CW, channels: 3, background: "#eeeeee" } })
    .composite(tiles).jpeg({ quality: 84 }).toFile(path.join(OUT, "sheet.jpg"));
}

console.log(`\n── ${path.basename(PDF)} ──\n`);
console.log(`  تصویر استخراج‌شده${"·".repeat(12)} ${found.length}`);
console.log(`  ماسک شفافیت (عکس نیست)${"·".repeat(6)} ${masks.size}`);
console.log(`  ردشده${"·".repeat(23)} ${skipped.length}`);
for (const [n, why] of skipped.slice(0, 8)) console.log(`     obj ${n}: ${why}`);
if (skipped.length > 8) console.log(`     … و ${skipped.length - 8} مورد دیگر`);
if (found.length) {
  console.log(`\n  فایل‌ها در ${OUT}/ — برگهٔ مرور: ${OUT}/sheet.jpg`);
  console.log("  گام بعد: هر فایل را به نامک محصولش تغییر نام بدهید، سپس:");
  console.log("     node scripts/import-product-photos.mjs --dir=" + OUT + " --dry");
}
console.log("");
