/**
 * =============================================================================
 *  دانلود عکس محصولات از روی فهرست نشانی — برای اجرا روی سیستم خودتان
 * =============================================================================
 *  بعضی سایت‌ها فقط از داخل ایران باز می‌شوند. این اسکریپت همان کاری را می‌کند
 *  که دستی می‌کردید، ولی صدتایی و بدون اشتباه در نام‌گذاری: فهرستی از
 *  «نامک محصول ← نشانی عکس» می‌گیرد، دانلود می‌کند، اعتبارش را می‌سنجد و با
 *  نام درست کنار هم می‌گذارد. خروجی مستقیم به import-product-photos.mjs می‌رود.
 *
 *  فهرست ورودی، یک CSV دوستونی بدون سربرگ است:
 *      tank-vertical-1000l,https://example.com/photo.jpg
 *      tank-vertical-1000l,https://example.com/photo-2.jpg     ← عکس دوم
 *      extinguisher-co2-6kg,https://example.com/co2.png
 *
 *  اجرا:
 *      node scripts/fetch-product-photos.mjs --list=photos.csv --out=./photos
 *      [--dry]        فقط بررسی فهرست و نامک‌ها، بدون دانلود
 *      [--force]      فایل موجود را دوباره دانلود کن
 *      [--delay=800]  فاصلهٔ میان درخواست‌ها به میلی‌ثانیه (پیش‌فرض ۸۰۰)
 *
 *  نامکی که در پایگاه داده محصول ندارد گزارش و رد می‌شود، نه اینکه حدس زده
 *  شود — همان قاعدهٔ بقیهٔ اسکریپت‌ها.
 * =============================================================================
 */
import "dotenv/config";

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import sharp from "sharp";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const LIST = arg("list");
const OUT = arg("out", "./photos");
const DELAY = Number(arg("delay", 800));
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

if (!LIST) {
  console.error("✖ فهرست را بدهید:  --list=photos.csv");
  process.exit(1);
}

/* نوع فایل از روی بایت‌های آغازین خوانده می‌شود، نه از پسوند نشانی: خیلی از
   سایت‌ها عکس را بدون پسوند یا با پسوند اشتباه سرو می‌کنند. */
const SIG = [
  [Buffer.from([0xff, 0xd8, 0xff]), "jpg"],
  [Buffer.from([0x89, 0x50, 0x4e, 0x47]), "png"],
];
function sniff(buf) {
  for (const [sig, ext] of SIG) if (buf.subarray(0, sig.length).equals(sig)) return ext;
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" &&
      buf.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

const rows = (await readFile(LIST, "utf8"))
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l, i) => {
    const c = l.indexOf(",");
    if (c < 0) return { line: i + 1, bad: "کاما ندارد", raw: l };
    return { line: i + 1, slug: l.slice(0, c).trim(), url: l.slice(c + 1).trim() };
  });

const bad = rows.filter((r) => r.bad || !r.slug || !/^https?:\/\//.test(r.url ?? ""));
const good = rows.filter((r) => !bad.includes(r));

/* نامک‌ها یک‌بار و با هم بررسی می‌شوند تا پیش از دانلود بدانیم کدام‌ها بی‌صاحب‌اند */
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const known = new Set(
  (await client.query("select slug from products")).rows.map((r) => r.slug),
);
await client.end();

const unknown = [...new Set(good.map((r) => r.slug))].filter((s) => !known.has(s));
const ready = good.filter((r) => known.has(r.slug));

console.log(`\n── ${path.basename(LIST)} ──\n`);
console.log(`  ردیف خوانده‌شده${"·".repeat(15)} ${rows.length}`);
console.log(`  آمادهٔ دانلود${"·".repeat(17)} ${ready.length}`);
if (bad.length) {
  console.log(`\n  ✖ ردیف نامعتبر (${bad.length}):`);
  for (const r of bad.slice(0, 8)) console.log(`     خط ${r.line}: ${r.bad ?? "نشانی نامعتبر"}`);
}
if (unknown.length) {
  console.log(`\n  ✖ نامکی که محصول ندارد (${unknown.length}):`);
  for (const s of unknown.slice(0, 10)) console.log(`     ${s}`);
  if (unknown.length > 10) console.log(`     … و ${unknown.length - 10} مورد دیگر`);
}
if (DRY || ready.length === 0) {
  console.log(DRY ? "\n  (اجرای آزمایشی — چیزی دانلود نشد)\n" : "\n");
  process.exit(0);
}

await mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seen = new Map();
let ok = 0;
const failed = [];

for (const [i, r] of ready.entries()) {
  const n = (seen.get(r.slug) ?? 0) + 1;
  seen.set(r.slug, n);
  const base = n === 1 ? r.slug : `${r.slug}-${n}`;

  try {
    const existing = await stat(path.join(OUT, `${base}.jpg`)).catch(() =>
      stat(path.join(OUT, `${base}.png`)).catch(() =>
        stat(path.join(OUT, `${base}.webp`)).catch(() => null)));
    if (existing && !FORCE) { ok++; continue; }

    const res = await fetch(r.url, {
      headers: {
        // بعضی سایت‌ها بدون این دو، درخواست را رد می‌کنند
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        referer: new URL(r.url).origin + "/",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = sniff(buf);
    if (!ext) throw new Error("پاسخ تصویر نبود (احتمالاً صفحهٔ خطا یا HTML)");

    // خواندن ابعاد، هم فایل خراب را رد می‌کند هم آیکون و اسپیسر را
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) throw new Error("ابعاد خوانده نشد");
    if (meta.width < 300 || meta.height < 300) {
      throw new Error(`کوچک ${meta.width}×${meta.height} — احتمالاً بندانگشتی`);
    }

    await writeFile(path.join(OUT, `${base}.${ext}`), buf);
    ok++;
    process.stdout.write(`\r  دانلود ${ok}/${ready.length} …`);
  } catch (e) {
    failed.push([base, e.message.slice(0, 60)]);
  }
  if (i < ready.length - 1) await sleep(DELAY);
}

console.log(`\r  دانلودشده${"·".repeat(20)} ${ok}          `);
if (failed.length) {
  console.log(`\n  ✖ ناموفق (${failed.length}):`);
  for (const [b, why] of failed.slice(0, 12)) console.log(`     ${b} — ${why}`);
  if (failed.length > 12) console.log(`     … و ${failed.length - 12} مورد دیگر`);
}
if (ok) {
  console.log("\n  گام بعد:");
  console.log(`     node scripts/import-product-photos.mjs --dir=${OUT} --dry`);
  console.log(`     node scripts/import-product-photos.mjs --dir=${OUT} --replace`);
}
console.log("");
