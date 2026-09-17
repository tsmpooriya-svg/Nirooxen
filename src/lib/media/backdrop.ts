import sharp from "sharp";

/**
 * =============================================================================
 *  تشخیص پس‌زمینهٔ عکس
 * =============================================================================
 *  قاب تصویر محصول، عکس را با mix-blend-mode: multiply روی خودش ترکیب می‌کند تا
 *  پس‌زمینهٔ سفیدِ عکس‌های استودیویی ناپدید شود و شبکهٔ نقشه‌کشی از زیرش بیرون
 *  بزند. این ترفند فقط وقتی کار می‌کند که پس‌زمینه واقعاً روشن باشد: ضرب کردن
 *  عکسی که پس‌زمینه‌اش تیره است، یک مستطیل سیاه می‌سازد — بدتر از کاری که
 *  اصلاً نکرده باشیم.
 *
 *  در همان نمونهٔ کوچک نه‌تایی کاتالوگ، یکی پس‌زمینهٔ تیره داشت. پس این حالت
 *  استثنای نادر نیست و نمی‌شود نادیده گرفت.
 *
 *  تصمیم یک بار در لحظهٔ آپلود گرفته و کنار خود تصویر ذخیره می‌شود، نه در
 *  لحظهٔ نمایش: هر صفحهٔ کاتالوگ ده‌ها تصویر دارد و باز کردن پیکسل‌هایشان در
 *  هر درخواست، هزینه‌ای است که هیچ‌وقت لازم نبوده.
 * =============================================================================
 */

export type Backdrop = "light" | "dark";

/** زیر این اندازه، «حلقهٔ لبه» معنا ندارد */
const MIN_SIDE = 16;
/** فاصلهٔ نمونه‌برداری از لبه — کمی تو، تا حاشیهٔ فشرده‌سازی نیفتد داخل نمونه */
const INSET = 0.02;
/** روشنایی‌ای که «سفید استودیویی» حساب می‌شود */
const BRIGHT = 200;
/** چه کسری از حلقهٔ لبه باید روشن باشد */
const BRIGHT_SHARE = 0.9;

/**
 * پس‌زمینه را از روی حلقهٔ لبهٔ تصویر تشخیص می‌دهد.
 *
 * ملاک «سهمِ روشن» است نه میانگین. یک محصول تیره که تا لبه ادامه پیدا می‌کند
 * میانگین را پایین می‌کشد، در حالی که پس‌زمینه همچنان سفید است و ترکیب درست
 * کار می‌کند؛ با میانگینِ تنها، چنین عکسی اشتباهاً «تیره» دسته‌بندی می‌شد.
 */
export async function detectBackdrop(buffer: Buffer): Promise<Backdrop> {
  try {
    /*
      تصویر به یک بندانگشتی کوچک تبدیل می‌شود: تصمیم به یک تخمین نیاز دارد، نه
      به همهٔ پیکسل‌ها، و این کار را روی هر اندازهٔ ورودی ارزان نگه می‌دارد.
      flatten پس‌زمینهٔ شفاف را سفید می‌کند — همان چیزی که مرورگر هم نشان می‌دهد.
    */
    const { data, info } = await sharp(buffer)
      .resize({ width: 96, height: 96, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    if (width < MIN_SIDE || height < MIN_SIDE) return "light";

    const inset = Math.max(1, Math.round(Math.min(width, height) * INSET));
    const luminance = (x: number, y: number) => {
      const i = (y * width + x) * channels;
      return data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
    };

    let bright = 0;
    let total = 0;
    const count = (value: number) => {
      total += 1;
      if (value >= BRIGHT) bright += 1;
    };
    for (let x = inset; x < width - inset; x += 1) {
      count(luminance(x, inset));
      count(luminance(x, height - 1 - inset));
    }
    for (let y = inset; y < height - inset; y += 1) {
      count(luminance(inset, y));
      count(luminance(width - 1 - inset, y));
    }

    if (total === 0) return "light";
    return bright / total >= BRIGHT_SHARE ? "light" : "dark";
  } catch {
    /*
      نتوانستیم بخوانیم؟ «تیره» برمی‌گردانیم، چون آن حالتِ محافظه‌کارانه است:
      ترکیب انجام نمی‌شود و تصویر دقیقاً مثل امروز نمایش داده می‌شود.
    */
    return "dark";
  }
}
