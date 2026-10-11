/**
 * =============================================================================
 *  ساخت تصویر Open Graph از طرح‌های محصول
 * =============================================================================
 *  og:image سایت تا امروز به همان فایل SVG محصول اشاره می‌کرد. تگ سرِ جایش
 *  بود و هر ممیزی‌ای که فقط وجود تگ را چک کند سبز می‌شد — ولی **فیسبوک،
 *  واتساپ، تلگرام، لینکدین و ایکس هیچ‌کدام SVG را رندر نمی‌کنند.** یعنی برای
 *  عملاً همهٔ کاتالوگ، لینکِ به‌اشتراک‌گذاشته‌شده کارت بی‌تصویر می‌داد.
 *
 *  این اسکریپت همان طرح‌ها را — بدون عوض کردن هیچ‌کدام — روی قاب ۱۲۰۰×۶۳۰
 *  می‌نشاند و PNG می‌دهد. زمینه همان قاب نقشه‌کشیِ خود سایت است، با همان
 *  توکن‌های رنگ، تا کارت اجتماعی و صفحهٔ محصول یک‌جور دیده شوند.
 *
 *  خروجی داخل مخزن commit می‌شود: ۶۲ فایل کوچک که در زمان build ساخته نمی‌شوند
 *  و در زمان اجرا هزینه‌ای ندارند.
 *
 *  اجرا:
 *      npm run og:build
 * =============================================================================
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

/** ابعاد استانداردی که همهٔ شبکه‌ها بر اساسش برش می‌زنند */
const WIDTH = 1200;
const HEIGHT = 630;
/** طرح تا این کسر از ارتفاع بالا می‌آید — حاشیه لازم است چون بعضی شبکه‌ها لبه را می‌برند */
const INSET = 0.92;

const SOURCE = "public/images/products";
const TARGET = "public/images/og/products";

/**
 * رنگ زمینهٔ خود طرح.
 *
 *  نخستین نسخه، طرح را روی قاب نقشه‌کشیِ ساخته‌شده می‌نشاند و نتیجه‌اش یک
 *  «قاب داخل قاب» بود: مستطیل روشنِ خود SVG روی زمینهٔ تیره‌ترِ من پیدا بود و
 *  شبیه اشتباه به نظر می‌رسید. طرح‌ها زمینهٔ خودشان را دارند، پس زمینهٔ کارت
 *  هم باید همان باشد — از خودِ فایل خوانده می‌شود، نه حدس زده.
 */
async function backdropOf(art: Buffer): Promise<{ r: number; g: number; b: number }> {
  const { data } = await sharp(art)
    .extract({ left: 0, top: 0, width: 8, height: 8 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0]!, g: data[1]!, b: data[2]! };
}

async function main() {
  mkdirSync(TARGET, { recursive: true });

  const files = readdirSync(SOURCE).filter((f) => f.endsWith(".svg")).sort();
  let written = 0;

  for (const file of files) {
    /*
      SVG بدون چگالی مشخص در اندازهٔ viewBox رستر می‌شود و بعد بزرگ‌کردنش تار
      در می‌آید. density بالا یعنی مستقیم در اندازهٔ نهایی رستر شود.
    */
    const art = await sharp(readFileSync(path.join(SOURCE, file)), { density: 300 })
      .resize({ height: Math.round(HEIGHT * INSET), fit: "inside" })
      .png()
      .toBuffer();

    const background = await backdropOf(art);

    const out = await sharp({
      create: { width: WIDTH, height: HEIGHT, channels: 3, background },
    })
      .composite([{ input: art, gravity: "centre" }])
      .png({ compressionLevel: 9, effort: 10, palette: true })
      .toBuffer();

    writeFileSync(path.join(TARGET, file.replace(/\.svg$/, ".png")), out);
    written += 1;
  }

  console.log(`\n  ${written} تصویر Open Graph ساخته شد در ${TARGET}/ (${WIDTH}×${HEIGHT})\n`);
}

void main();
