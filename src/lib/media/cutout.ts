import sharp from "sharp";

/**
 * =============================================================================
 *  برداشتن پس‌زمینهٔ عکس آپلودی
 * =============================================================================
 *  عکس محصول با پس‌زمینهٔ شفاف روی قاب نقشه‌کشی می‌نشیند، نه به‌عنوان یک مستطیل
 *  جدا. این کار جای ترفند multiply را می‌گیرد و دو چیز را درست می‌کند که آن
 *  ترفند نمی‌توانست: عکسی که پس‌زمینه‌اش تیره است، و عکسی که پس‌زمینه‌اش خاکستری
 *  ملایم است نه سفیدِ خالص.
 *
 *  روش، پرکردن سیلابی از لبه است نه «هر پیکسل سفید را شفاف کن». تفاوتش
 *  تعیین‌کننده است: برچسب سفید روی بدنهٔ پمپ، یا بازتاب نور روی فلز، به لبهٔ
 *  تصویر **وصل نیست**، پس دست‌نخورده می‌ماند. قاعدهٔ رنگی ساده، وسط محصول سوراخ
 *  می‌کرد.
 *
 *  محافظه‌کار است و باید باشد: اگر لبهٔ تصویر یکدست نباشد — یعنی عکس در محیط
 *  واقعی گرفته شده، نه در استودیو — دست نمی‌زند و تصویر همان‌طور می‌ماند.
 *  تصویر بریدهٔ بد، از تصویر نبریده بدتر است.
 *
 *  نسخهٔ اصلی هیچ‌وقت تغییر نمی‌کند؛ این فقط روی نسخهٔ تحویلی اعمال می‌شود، پس
 *  اگر روزی روش بهتری آمد می‌شود از روی همان اصلی دوباره ساخت.
 * =============================================================================
 */

/** حداکثر فاصلهٔ رنگی که «قطعاً پس‌زمینه» حساب می‌شود (مجذور فاصله در RGB) */
const CORE = 26 * 26 * 3;
/** تا این فاصله هنوز پس‌زمینه است، ولی نیمه‌شفاف — همین لبه را نرم می‌کند */
const EDGE = 52 * 52 * 3;
/** چه کسری از حلقهٔ لبه باید هم‌رنگ باشد تا تصویر «استودیویی» شمرده شود */
const UNIFORM_SHARE = 0.92;
/** اگر بیش از این کسر از کل تصویر برداشته شود، تشخیص اشتباه بوده */
const MAX_REMOVED = 0.96;
/** و اگر کمتر از این، عملاً کاری نکرده‌ایم */
const MIN_REMOVED = 0.04;

type Rgb = [number, number, number];

function distance(data: Buffer, i: number, bg: Rgb): number {
  const dr = data[i]! - bg[0];
  const dg = data[i + 1]! - bg[1];
  const db = data[i + 2]! - bg[2];
  return dr * dr + dg * dg + db * db;
}

/** رنگ پس‌زمینه = میانهٔ حلقهٔ لبه. میانه و نه میانگین، تا محصولِ چسبیده به لبه آن را نکشد. */
function borderColor(data: Buffer, width: number, height: number, ch: number): Rgb {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const push = (x: number, y: number) => {
    const i = (y * width + x) * ch;
    reds.push(data[i]!);
    greens.push(data[i + 1]!);
    blues.push(data[i + 2]!);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  const median = (values: number[]) => {
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)]!;
  };
  return [median(reds), median(greens), median(blues)];
}

export type Cutout = { data: Buffer; removed: boolean };

/**
 * پس‌زمینه را برمی‌دارد و PNG شفاف برمی‌گرداند.
 *
 * `removed: false` یعنی دست نزدیم و بافر ورودی دست‌نخورده برگشته.
 */
export async function removeBackdrop(buffer: Buffer, quality: number): Promise<Cutout> {
  try {
    const { data, info } = await sharp(buffer)
      .flatten({ background: "#ffffff" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels: ch } = info;
    if (width < 32 || height < 32) return { data: buffer, removed: false };

    const bg = borderColor(data, width, height, ch);

    /*
      یکدستی لبه، دروازهٔ ورود است. عکسی که در کارگاه یا انبار گرفته شده لبهٔ
      رنگارنگ دارد و پرکردن سیلابی رویش نتیجهٔ غیرقابل پیش‌بینی می‌دهد.
    */
    let uniform = 0;
    let border = 0;
    const check = (x: number, y: number) => {
      border += 1;
      if (distance(data, (y * width + x) * ch, bg) <= EDGE) uniform += 1;
    };
    for (let x = 0; x < width; x += 1) {
      check(x, 0);
      check(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      check(0, y);
      check(width - 1, y);
    }
    if (uniform / border < UNIFORM_SHARE) return { data: buffer, removed: false };

    /*
      پرکردن سیلابی از لبه. صف با آرایهٔ عددی و اندیس خوانده‌شده پیش می‌رود، نه
      با shift(): روی تصویر چندمگاپیکسلی، shift() آرایه را هر بار جابه‌جا
      می‌کند و همین کار را از میلی‌ثانیه به ثانیه می‌رساند.
    */
    const alpha = new Uint8Array(width * height).fill(255);
    const seen = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    const push = (p: number) => {
      if (seen[p]) return;
      const d = distance(data, p * ch, bg);
      if (d > EDGE) return;
      seen[p] = 1;
      // بین CORE و EDGE، شفافیت تدریجی می‌شود و لبهٔ محصول دندانه‌دار نمی‌ماند
      alpha[p] = d <= CORE ? 0 : Math.round(((d - CORE) / (EDGE - CORE)) * 255);
      queue[tail++] = p;
    };

    for (let x = 0; x < width; x += 1) {
      push(x);
      push((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      push(y * width);
      push(y * width + width - 1);
    }

    while (head < tail) {
      const p = queue[head++]!;
      const x = p % width;
      const y = (p / width) | 0;
      if (x > 0) push(p - 1);
      if (x < width - 1) push(p + 1);
      if (y > 0) push(p - width);
      if (y < height - 1) push(p + width);
    }

    let cleared = 0;
    for (let p = 0; p < alpha.length; p += 1) if (alpha[p]! < 128) cleared += 1;
    const share = cleared / alpha.length;
    /*
      دو نرده‌بان: اگر تقریباً همه‌چیز رفته، محصول هم‌رنگ پس‌زمینه بوده و آنچه
      مانده بی‌معناست؛ اگر تقریباً هیچ نرفته، حاشیه‌ای نبوده که برداشته شود.
    */
    if (share > MAX_REMOVED || share < MIN_REMOVED) return { data: buffer, removed: false };

    const out = Buffer.alloc(width * height * 4);
    for (let p = 0; p < width * height; p += 1) {
      out[p * 4] = data[p * ch]!;
      out[p * 4 + 1] = data[p * ch + 1]!;
      out[p * 4 + 2] = data[p * ch + 2]!;
      out[p * 4 + 3] = alpha[p]!;
    }

    /*
      WebP و نه PNG: همان فرمت نسخهٔ تحویلی است، شفافیت را پشتیبانی می‌کند، و
      برای همین عکس‌ها حدود یک‌دهم PNG جا می‌گیرد. کیفیت از فراخوان می‌آید تا
      با بقیهٔ خط لوله یکی بماند.
    */
    const webp = await sharp(out, { raw: { width, height, channels: 4 } })
      .webp({ quality, alphaQuality: 100 })
      .toBuffer();

    return { data: webp, removed: true };
  } catch {
    return { data: buffer, removed: false };
  }
}
