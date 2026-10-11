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
/*
  سقف «حاشیهٔ نیمه‌شفاف».

  محصولِ سفید روی پس‌زمینهٔ سفید — یعنی دقیقاً مخزن آب در عکس استودیویی — تنها
  حالتی است که هر سه نرده‌بان بالا را رد می‌کند و باز خروجی خراب می‌دهد: سیلاب
  از پس‌زمینه وارد بدنهٔ محصول می‌شود و چون رنگ بدنه در فاصلهٔ CORE..EDGE است،
  به‌جای برداشته‌شدن، *نیمه‌شفاف* می‌شود. روی قاب روشن دیده نمی‌شود، ولی در تم
  تیره بدنهٔ سفید مخزن خاکستریِ کثیف یا تقریباً سیاه در می‌آید.

  اندازه‌گیری روی دو مجموعهٔ واقعی، این را تمیز جدا می‌کند:
    ۲۴ عکس بریدهٔ کاتالوگ آتش‌نشانی (که نتیجه‌شان درست بود): ۰٫۲٪ تا ۱٫۹٪
    ۳ عکس استودیویی مخزن آب (که نتیجه‌شان خراب بود):         ۸٫۳٪، ۱۴٫۸٪، ۱۶٫۵٪

  پس ۶٪ وسط این شکاف است، نه عددی حدسی. عکس‌هایی که اینجا رد می‌شوند به همان
  راه قدیمی (multiply روی قاب روشن) برمی‌گردند که برای‌شان درست کار می‌کند.
*/
const MAX_FRINGE = 0.06;

/** آلفای زیر این «شفاف» و بالای آن «مات» حساب می‌شود؛ بین این دو، حاشیه است */
const CLEAR_ALPHA = 16;
const SOLID_ALPHA = 239;
/** چه کسری از حلقهٔ لبه باید شفاف باشد تا تصویر «از قبل بریده» شمرده شود */
const PRECUT_BORDER = 0.95;

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

/**
 * آیا تصویر از قبل پس‌زمینهٔ برداشته دارد؟
 *
 * فایلی که از PDF یا از یک ابزار دیگر بیرون آمده ممکن است خودش شفاف باشد. تا
 * امروز آن را روی سفید صاف می‌کردیم و دوباره سیلاب می‌انداختیم — یعنی یک بُرشِ
 * دقیق را با یک بُرشِ حدسی جایگزین می‌کردیم. اینجا فقط تشخیص می‌دهیم که
 * دست‌نزدن درست‌تر است.
 *
 * دو شرط، و هر دو لازم‌اند:
 *   حلقهٔ لبه شفاف باشد  — وگرنه آلفا برای چیز دیگری بوده، نه برای پس‌زمینه
 *   آلفا تقریباً دودویی باشد — یعنی شفاف یا مات، با فقط یک حاشیهٔ نازک
 *
 * شرط دوم همان چیزی است که فایل خراب را می‌گیرد: خروجی معیوبی دیده‌ایم که کل
 * تصویرش نیمه‌شفاف بود (۳۵٪ پیکسل در میانه)، در حالی که ۲۴ عکس سالم کاتالوگ
 * همگی زیر ۳٫۴٪ بودند.
 */
async function alreadyCut(buffer: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels: ch } = info;
  if (ch !== 4) return false;

  let border = 0;
  let clear = 0;
  const check = (x: number, y: number) => {
    border += 1;
    if (data[(y * width + x) * ch + 3]! <= CLEAR_ALPHA) clear += 1;
  };
  for (let x = 0; x < width; x += 1) {
    check(x, 0);
    check(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    check(0, y);
    check(width - 1, y);
  }
  if (border === 0 || clear / border < PRECUT_BORDER) return false;

  let fringe = 0;
  for (let p = 0; p < width * height; p += 1) {
    const a = data[p * ch + 3]!;
    if (a > CLEAR_ALPHA && a < SOLID_ALPHA) fringe += 1;
  }
  return fringe / (width * height) <= MAX_FRINGE;
}

export type Cutout = { data: Buffer; removed: boolean };

/**
 * پس‌زمینه را برمی‌دارد و PNG شفاف برمی‌گرداند.
 *
 * `removed: false` یعنی دست نزدیم و بافر ورودی دست‌نخورده برگشته.
 */
export async function removeBackdrop(buffer: Buffer, quality: number): Promise<Cutout> {
  try {
    /*
      تصویری که خودش آلفا دارد هیچ‌وقت سیلابی بریده نمی‌شود: یا از قبل درست
      بریده شده و بهترین کار دست‌نزدن است، یا آلفایش را نمی‌فهمیم و آن‌وقت
      حدس زدن از رها کردن بدتر است.
    */
    if ((await sharp(buffer).metadata()).hasAlpha) {
      return { data: buffer, removed: await alreadyCut(buffer) };
    }

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
    let fringe = 0;
    for (let p = 0; p < alpha.length; p += 1) {
      const a = alpha[p]!;
      if (a < 128) cleared += 1;
      if (a > CLEAR_ALPHA && a < SOLID_ALPHA) fringe += 1;
    }
    const share = cleared / alpha.length;
    /*
      سه نرده‌بان: اگر تقریباً همه‌چیز رفته، محصول هم‌رنگ پس‌زمینه بوده و آنچه
      مانده بی‌معناست؛ اگر تقریباً هیچ نرفته، حاشیه‌ای نبوده که برداشته شود؛ و
      اگر حاشیهٔ نیمه‌شفاف پهن شده، سیلاب وارد خود محصول شده است.
    */
    if (share > MAX_REMOVED || share < MIN_REMOVED) return { data: buffer, removed: false };
    if (fringe / alpha.length > MAX_FRINGE) return { data: buffer, removed: false };

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
